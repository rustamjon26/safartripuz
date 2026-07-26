# Contabo VPS install notes (`169.58.78.29`)

## Host key fingerprints (save in password manager)

Captured from first successful client `known_hosts` entry (2026-07-26):

| Type | Fingerprint |
|------|-------------|
| ED25519 | `SHA256:QPMnnio6xMRc/xGymjdzAMA36anxwVSNkRqWQk1O/ZU` |
| RSA | `SHA256:x+jt5szayxiEikSvev2QDM2bjZick04gVvaKhQNo2Ig` |

Verify on server anytime:

```bash
ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
ssh-keygen -lf /etc/ssh/ssh_host_rsa_key.pub
```

## Path convention

Repo deploy scripts + `ecosystem.config.js` use **`/var/www/safar`** (not `/var/www/safartrip`). Prefer that path on Contabo so `deploy.sh` / PM2 match.

## Status snapshot (2026-07-26 late)

Done:

- Fingerprints match (`SHA256:QPMnnio6…` / `SHA256:x+jt5sz…`)
- UFW 22/80/443, fail2ban, PasswordAuthentication off, local key `safartrip-contabo` works for root
- Node 22, MySQL 8, nginx, certbot, pm2
- Repo cloned to `/var/www/safar`
- MySQL user `safartrip@localhost` created; password in `/etc/safartrip/mysql-safartrip.pass`
- `/etc/safartrip/backup.env` has `DATABASE_URL` + `BACKUP_OFFSITE_CMD`

Still open:

- App `.env` (JWT/Payme/Click/Didox — all new secrets)
- `npm ci`, `prisma migrate deploy`, build, PM2 ecosystem
- Cron backup + restore-test dry run
- DNS → certbot; Payme/Click/Didox IP `169.58.78.29`
- Kernel reboot pending (`6.8.0-136`)

## Agent access

Cursor agent has **no** password/key auth to this host (`Permission denied` in BatchMode). Continue via your open `ssh root@169.58.78.29` session or after `ssh-copy-id`.
