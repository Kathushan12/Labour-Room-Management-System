import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import readline from 'readline';
import { UserRole, ProfessionalRegistrationBody } from '@lrms/shared';
import { initializeDatabase, AppDataSource } from '../config/database.js';
import { User, Role, StaffProfile, AuditLog } from '../database/entities/index.js';
import { hashPassword, validatePasswordInput } from '../common/crypto/password.service.js';
import { applyEncryptedContactNumber } from '../modules/users/user.dto.js';

export interface BootstrapAdminInput {
  username?: string;
  password?: string;
  fullName?: string;
  email?: string;
  staffId?: string;
  professionalRegistrationBody?: ProfessionalRegistrationBody;
  professionalRegistrationNumber?: string;
  contactNumber?: string;
}

interface ParsedCliFlags {
  username?: string;
  fullName?: string;
  email?: string;
  staffId?: string;
  professionalRegistrationBody?: ProfessionalRegistrationBody;
  professionalRegistrationNumber?: string;
  contactNumber?: string;
  passwordFile?: string;
  passwordStdin?: boolean;
}

function parseCliFlags(): ParsedCliFlags {
  const args = process.argv.slice(2);
  const result: ParsedCliFlags = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    // Strict security check: reject CLI password or --force arguments
    if (
      arg === '--password' ||
      arg.startsWith('--password=') ||
      arg === '-p' ||
      arg.startsWith('-p=')
    ) {
      throw new Error(
        'Security policy violation: Passwords must never be supplied via command-line arguments. Use interactive masked prompt, --password-stdin, or --password-file.',
      );
    }

    if (arg === '--force' || arg.startsWith('--force=')) {
      throw new Error(
        'The --force flag is disabled by security policy. CLI bootstrap may only provision the initial administrator when zero administrator accounts exist.',
      );
    }

    if (arg === '--username' && i + 1 < args.length) {
      result.username = args[++i];
    } else if (arg === '--name' && i + 1 < args.length) {
      result.fullName = args[++i];
    } else if (arg === '--email' && i + 1 < args.length) {
      result.email = args[++i];
    } else if (arg === '--staff-id' && i + 1 < args.length) {
      result.staffId = args[++i];
    } else if (arg === '--reg-body' && i + 1 < args.length) {
      const val = args[++i].toUpperCase();
      if (val === 'SLMC' || val === 'SLNC' || val === 'OTHER') {
        result.professionalRegistrationBody = val as ProfessionalRegistrationBody;
      } else {
        throw new Error('Invalid --reg-body value. Allowed: SLMC, SLNC, OTHER.');
      }
    } else if (arg === '--reg-number' && i + 1 < args.length) {
      result.professionalRegistrationNumber = args[++i];
    } else if (arg === '--contact' && i + 1 < args.length) {
      result.contactNumber = args[++i];
    } else if (arg === '--password-file' && i + 1 < args.length) {
      result.passwordFile = args[++i];
    } else if (arg.startsWith('--password-file=')) {
      result.passwordFile = arg.substring('--password-file='.length);
    } else if (arg === '--password-stdin') {
      result.passwordStdin = true;
    }
  }

  return result;
}

function askQuestion(rl: readline.Interface, query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      resolve(answer.trim());
    });
  });
}

function askPassword(rl: readline.Interface, query: string): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    process.stdout.write(query);

    let password = '';
    const onData = (char: Buffer) => {
      const charStr = char.toString('utf8');
      switch (charStr) {
        case '\n':
        case '\r':
        case '\u0004':
          stdin.removeListener('data', onData);
          if (stdin.setRawMode) {
            stdin.setRawMode(false);
          }
          process.stdout.write('\n');
          resolve(password);
          break;
        case '\u0003': // Ctrl+C
          process.exit(1);
          break;
        case '\b':
        case '\x7f':
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write('\b \b');
          }
          break;
        default:
          password += charStr;
          process.stdout.write('*');
          break;
      }
    };

    if (process.stdin.isTTY) {
      stdin.setRawMode?.(true);
      stdin.resume();
      stdin.on('data', onData);
    } else {
      rl.question('', (ans) => {
        resolve(ans.trim());
      });
    }
  });
}

async function readPasswordFromStdinStream(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      resolve(data.replace(/\r?\n$/, ''));
    });
    process.stdin.on('error', (err) => {
      reject(err);
    });
  });
}

export function assertSecurePasswordFile(filePath: string): string {
  const resolvedPath = path.resolve(filePath);
  let stats: fs.Stats;

  try {
    stats = fs.lstatSync(resolvedPath);
  } catch {
    throw new Error('Specified password secret file could not be accessed.');
  }

  if (stats.isSymbolicLink() || !stats.isFile()) {
    throw new Error(
      'Security policy violation: Password secret path must be a regular file, not a symlink or directory.',
    );
  }

  if (process.platform === 'win32') {
    const aclOutput = execFileSync('icacls', [resolvedPath], { encoding: 'utf8' });
    const broadPrincipalPattern =
      /\b(Everyone|BUILTIN\\Users|NT AUTHORITY\\Authenticated Users|Authenticated Users|ANONYMOUS LOGON|Guests)\b/i;
    const aclLines = aclOutput
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !/^Successfully processed/i.test(line));

    if (aclLines.some((line) => broadPrincipalPattern.test(line))) {
      throw new Error(
        'Security policy violation: Password file permissions are overly permissive. Restrict NTFS ACLs to owner-only access before retrying.',
      );
    }
  } else {
    if ((stats.mode & 0o077) !== 0) {
      throw new Error(
        'Security policy violation: Password file permissions are overly permissive. Set mode 0600 or 0400 (owner-only) before retrying.',
      );
    }
  }

  return resolvedPath;
}

export async function bootstrapAdmin(
  programmaticInput?: BootstrapAdminInput,
): Promise<{ userId: string; username: string } | null> {
  console.log('\n=============================================================');
  console.log(' Labour Room Management System (LRMS) - Admin Bootstrap CLI');
  console.log('=============================================================\n');

  const cliFlags = parseCliFlags();
  if (cliFlags.passwordFile) {
    assertSecurePasswordFile(cliFlags.passwordFile);
  }
  await initializeDatabase();

  const roleRepo = AppDataSource.getRepository(Role);
  const userRepo = AppDataSource.getRepository(User);

  // 1. Ensure ADMIN role exists in database
  let adminRole = await roleRepo.findOne({ where: { name: UserRole.ADMIN } });
  if (!adminRole) {
    console.log('[+] Initializing ADMIN role in database...');
    adminRole = roleRepo.create({
      name: UserRole.ADMIN,
      description:
        'System Administrator: Configures wards, physical beds, manages staff accounts, reviews audit trails and reports.',
    });
    await roleRepo.save(adminRole);
  }

  // 2. Enforce strict single-initial-admin protection (regardless of active/inactive state)
  const existingAdmin = await userRepo.findOne({
    where: { roleId: adminRole.id },
  });

  if (existingAdmin) {
    console.log(
      '[!] Security Policy Notice: An administrator account already exists in the database.',
    );
    console.log(
      '[!] Initial CLI bootstrap cannot create additional administrators. Use the authenticated Admin Staff Management portal.',
    );
    return null;
  }

  let username = programmaticInput?.username ?? cliFlags.username;
  let password = programmaticInput?.password;
  let fullName = programmaticInput?.fullName ?? cliFlags.fullName;
  let email = programmaticInput?.email ?? cliFlags.email;
  let staffId = programmaticInput?.staffId ?? cliFlags.staffId;
  let regBody =
    programmaticInput?.professionalRegistrationBody ?? cliFlags.professionalRegistrationBody;
  let regNumber =
    programmaticInput?.professionalRegistrationNumber ?? cliFlags.professionalRegistrationNumber;
  let contactNumber = programmaticInput?.contactNumber ?? cliFlags.contactNumber;

  // Protected non-interactive secret mechanisms (never via CLI args)
  if (!password && cliFlags.passwordFile) {
    const secureFile = assertSecurePasswordFile(cliFlags.passwordFile);
    password = fs.readFileSync(secureFile, 'utf8').replace(/\r?\n$/, '');
  } else if (!password && cliFlags.passwordStdin) {
    password = await readPasswordFromStdinStream();
  }

  const isInteractive = Boolean(process.stdin.isTTY && process.env.NODE_ENV !== 'test');
  const rl = isInteractive
    ? readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      })
    : null;

  try {
    if (!username) {
      if (rl) {
        username = await askQuestion(rl, 'Enter Administrator Username (e.g., admin_csth): ');
      } else {
        throw new Error('Administrator username is required.');
      }
    }

    if (!fullName) {
      if (rl) {
        fullName = await askQuestion(rl, 'Enter Full Name (e.g., Dr. Jane Perera): ');
      }
      if (!fullName) {
        throw new Error('Administrator full name is required.');
      }
    }

    if (email === undefined && rl) {
      const enteredEmail = await askQuestion(
        rl,
        'Enter Official Email Address (optional, press Enter to skip): ',
      );
      email = enteredEmail || undefined;
    }

    if (staffId === undefined && rl) {
      const enteredStaffId = await askQuestion(
        rl,
        'Enter Hospital Staff ID (optional, press Enter to skip): ',
      );
      staffId = enteredStaffId || undefined;
    }

    if (regNumber === undefined && rl) {
      const enteredRegNumber = await askQuestion(
        rl,
        'Enter Professional Registration Number (optional, press Enter to skip): ',
      );
      regNumber = enteredRegNumber || undefined;
    }

    if (regNumber && !regBody && rl) {
      const enteredBody = (
        await askQuestion(rl, 'Enter Registration Body [SLMC/SLNC/OTHER] (optional): ')
      ).toUpperCase();
      if (enteredBody === 'SLMC' || enteredBody === 'SLNC' || enteredBody === 'OTHER') {
        regBody = enteredBody as ProfessionalRegistrationBody;
      }
    }

    if (contactNumber === undefined && rl) {
      const enteredContact = await askQuestion(
        rl,
        'Enter Contact Number (optional, press Enter to skip): ',
      );
      contactNumber = enteredContact || undefined;
    }

    if (!password) {
      if (rl) {
        password = await askPassword(rl, 'Enter Administrator Password (masked): ');
      } else {
        throw new Error(
          'Password input is required via interactive TTY prompt, --password-stdin, or --password-file.',
        );
      }
    }

    const policyResult = validatePasswordInput(password);
    if (!policyResult.valid) {
      throw new Error(`Password policy violation: ${policyResult.message}`);
    }

    console.log('\n[*] Computing Argon2id hash with OWASP parameters (32 MiB, 3 iterations)...');
    const passwordHash = await hashPassword(password);

    const created = await AppDataSource.transaction(async (transactionManager) => {
      // Lock the ADMIN role row to prevent concurrent duplicate bootstrap
      const lockedAdminRole = await transactionManager.findOneOrFail(Role, {
        where: { id: adminRole.id },
        lock: { mode: 'pessimistic_write' },
      });

      const doubleCheckAdmin = await transactionManager.findOne(User, {
        where: { roleId: lockedAdminRole.id },
      });

      if (doubleCheckAdmin) {
        throw new Error('An administrator account was created concurrently. Bootstrap aborted.');
      }

      const duplicateUsername = await transactionManager
        .createQueryBuilder(User, 'u')
        .where('LOWER(u.username) = LOWER(:username)', { username })
        .getOne();

      if (duplicateUsername) {
        throw new Error(`Username '${username}' is already taken.`);
      }

      const now = new Date();
      const newUser = transactionManager.create(User, {
        username,
        passwordHash,
        fullName,
        roleId: lockedAdminRole.id,
        email: email || null,
        isActive: true,
        mustChangePassword: false,
        passwordChangedAt: now,
        temporaryPasswordExpiresAt: null,
      });

      await transactionManager.save(newUser);

      const newProfile = transactionManager.create(StaffProfile, {
        userId: newUser.id,
        staffId: staffId || null,
        professionalRegistrationBody: regBody || null,
        professionalRegistrationNumber: regNumber || null,
      });
      applyEncryptedContactNumber(newProfile, contactNumber || null);

      await transactionManager.save(newProfile);

      await transactionManager.save(
        transactionManager.create(AuditLog, {
          userId: newUser.id,
          action: 'USER_BOOTSTRAPPED',
          entityName: 'User',
          entityId: newUser.id,
          details: {
            username: newUser.username,
            role: UserRole.ADMIN,
            bootstrapSource: 'CLI',
            staffProfileInitialized: true,
          },
        }),
      );

      return { userId: newUser.id, username: newUser.username };
    });

    console.log('\n[✔] SUCCESS: First administrator account provisioned.');
    console.log(`    User ID:  ${created.userId}`);
    console.log(`    Username: ${created.username}`);
    console.log(`    Role:     ${UserRole.ADMIN}\n`);

    return created;
  } finally {
    rl?.close();
  }
}

const isMainExecution =
  !process.env.VITEST &&
  process.env.NODE_ENV !== 'test' &&
  (process.argv[1]?.endsWith('bootstrap-admin.ts') ||
    process.argv[1]?.endsWith('bootstrap-admin.js'));

if (isMainExecution) {
  bootstrapAdmin()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error(
        '\n[FATAL] Admin bootstrap failed:',
        err instanceof Error ? err.message : 'Unexpected bootstrap failure',
      );
      process.exit(1);
    });
}
