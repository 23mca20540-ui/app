# PassGuard - Secure Password Generator & Vault

A privacy-first password manager with client-side encryption built with Next.js, MongoDB, and crypto-js.

## Features

### Password Generator
- Customizable length (8-64 characters)
- Character type options: lowercase, uppercase, numbers, symbols
- Exclude look-alike characters (0/O, 1/l/I) option
- Real-time password strength indicator
- Copy to clipboard with auto-clear after 15 seconds

### Secure Vault
- Client-side AES-256 encryption (data encrypted before leaving browser)
- JWT-based authentication
- Full CRUD operations (Create, Read, Update, Delete)
- Search/filter vault items
- Store: title, username, password, URL, and notes
- View/hide passwords with eye icon
- Quick copy passwords to clipboard

### Security Features
- **Client-side encryption**: Vault items encrypted with AES-256 using PBKDF2 key derivation
- **Zero-knowledge architecture**: Server never sees plaintext passwords
- Passwords hashed with bcrypt before storage
- JWT tokens for secure session management
- Master password required for vault access

### UI/UX
- Dark mode support
- Beautiful, minimal interface with Tailwind CSS + shadcn/ui
- Responsive design
- Real-time search
- Smooth animations and transitions

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Backend**: Next.js API Routes
- **Database**: MongoDB
- **Encryption**: crypto-js (AES-256 + PBKDF2)
- **Authentication**: JWT + bcryptjs
- **UI**: Tailwind CSS + shadcn/ui
- **Icons**: lucide-react

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB running on localhost:27017
- Yarn package manager

### Installation

1. Clone the repository
```bash
git clone <your-repo-url>
cd passguard
```

2. Install dependencies
```bash
yarn install
```

3. Set up environment variables
```bash
# .env file
MONGO_URL=mongodb://localhost:27017
DB_NAME=passguard
JWT_SECRET=your-secret-key-change-in-production
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

4. Run the development server
```bash
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## How It Works

### Encryption
All vault data is encrypted **client-side** before being sent to the server:

1. User enters master password during signup/login
2. Master password is used to derive an encryption key using PBKDF2 (10,000 iterations)
3. Vault items are encrypted with AES-256 using the derived key
4. Only the encrypted blob is stored in MongoDB
5. Server never has access to the plaintext data or encryption key

**Crypto Library Choice**: We use **crypto-js** for client-side encryption because:
- Well-established library with wide browser support
- Implements AES-256 encryption standard
- PBKDF2 key derivation for secure key generation from passwords
- Simple API for encrypt/decrypt operations
- Zero dependencies on server-side crypto

### Authentication
- Email + password authentication
- Passwords hashed with bcrypt (10 rounds) before storage
- JWT tokens (7-day expiration) for session management
- Master password stored in localStorage for encryption/decryption (user can clear on logout)

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Login to existing account

### Vault
- `GET /api/vault` - Get all vault items (supports ?search=query)
- `POST /api/vault` - Create new vault item
- `PUT /api/vault/:itemId` - Update vault item
- `DELETE /api/vault/:itemId` - Delete vault item

All vault endpoints require JWT authentication via `Authorization: Bearer <token>` header.

## Database Schema

### Users Collection
```javascript
{
  userId: String (UUID),
  email: String (unique),
  password: String (bcrypt hash),
  createdAt: Date
}
```

### VaultItems Collection
```javascript
{
  itemId: String (UUID),
  userId: String (foreign key),
  title: String (searchable),
  username: String (searchable),
  url: String (searchable),
  encryptedData: String (AES-256 encrypted blob),
  createdAt: Date,
  updatedAt: Date
}
```

Note: `encryptedData` contains the encrypted JSON with all sensitive fields (password, notes, etc.)

## Security Considerations

### What's Encrypted
- ✅ Vault item passwords
- ✅ Vault item notes
- ✅ All sensitive vault data

### What's NOT Encrypted (for search functionality)
- ❌ Vault item titles
- ❌ Usernames/emails
- ❌ URLs

### Best Practices Implemented
- Client-side encryption (zero-knowledge)
- PBKDF2 key derivation (10,000 iterations)
- AES-256 encryption
- Bcrypt password hashing
- JWT token expiration
- Auto-clear clipboard after 15 seconds
- No plaintext passwords in logs
- No sensitive data in network requests

### Production Recommendations
1. Use HTTPS in production
2. Change JWT_SECRET to a strong random value
3. Implement rate limiting on auth endpoints
4. Add CORS restrictions
5. Enable MongoDB authentication
6. Add 2FA (optional enhancement)
7. Implement session timeout
8. Add audit logging

## Future Enhancements (Not in MVP)

- 2FA (TOTP)
- Tags/folders organization
- Export/import encrypted vault (JSON)
- Password history
- Shared vault items
- Browser extension
- Password breach checking
- Auto-fill functionality

## Testing

### Acceptance Criteria ✅
- [x] Sign up and log in working
- [x] Add vault items with encryption
- [x] Only encrypted blobs visible in database
- [x] Password generator works instantly
- [x] Copy to clipboard with auto-clear (15 seconds)
- [x] Search returns expected items
- [x] Edit and delete vault items
- [x] Dark mode toggle

### Manual Testing Steps

1. **Sign Up**
   - Navigate to home page
   - Click "Sign Up" tab
   - Enter email and master password
   - Verify successful account creation

2. **Password Generator**
   - Go to "Password Generator" tab
   - Adjust length slider
   - Toggle character options
   - Click "Generate New Password"
   - Copy password and verify it clears after 15 seconds

3. **Vault Operations**
   - Go to "Vault" tab
   - Click "Add Item"
   - Fill in title, username, password, URL, notes
   - Click "Use Generated" to use generated password
   - Save item
   - Verify item appears in vault
   - Search for item
   - Edit item
   - Delete item

4. **Encryption Verification**
   - Add a vault item
   - Check MongoDB collection directly:
     ```bash
     mongo
     use passguard
     db.vaultItems.find().pretty()
     ```
   - Verify `encryptedData` field is encrypted (not readable)
   - Verify title, username, url are NOT encrypted (for search)

5. **Dark Mode**
   - Toggle dark mode switch in header
   - Verify all components adapt to dark theme

## License

MIT

## Contributors

Built as an MVP for secure password management.
