# 📁 Project Structure Guide for Junior Developers

This project follows **Next.js App Router** conventions with a clean, maintainable folder structure designed for easy understanding and growth.

## 🏗️ **Main Folder Structure**

```
poll-app/
├── app/                    # Next.js App Router pages
├── components/             # Reusable UI components
├── lib/                   # Business logic & utilities
├── public/               # Static assets
└── types/               # TypeScript definitions
```

## 📂 **Detailed Breakdown**

### `/app/` - Application Pages
**Purpose**: Contains all your routes and pages
- `page.tsx` - Home page ("/")
- `layout.tsx` - Global layout wrapper
- `globals.css` - Global styles
- `auth/` - Authentication pages
  - `login/page.tsx` - Login form ("/auth/login")
  - `register/page.tsx` - Registration form ("/auth/register")
- `polls/` - Poll-related pages
  - `page.tsx` - All polls list ("/polls")
  - `create/page.tsx` - Create new poll ("/polls/create")
  - `[id]/page.tsx` - Individual poll details ("/polls/123")

### `/components/` - Reusable Components
**Organized by feature/type for easy maintenance:**
```
components/
├── ui/                   # Basic UI components (Button, Input, etc.)
├── layout/              # Layout components (Navbar, Footer, Sidebar)
├── forms/               # Form-specific components
├── features/            # Feature-specific components
└── shared/              # Shared utilities
```

### `/lib/` - Business Logic
**Purpose**: All your app logic, separate from UI
```
lib/
├── schemas/             # Zod validation schemas
│   ├── auth.schema.ts    # Login/register validation
│   └── poll.schema.ts    # Poll/vote validation
├── types/               # TypeScript types
│   └── index.ts        # All type definitions
├── utils/              # Helper functions
│   ├── auth.ts         # Authentication helpers
│   └── notifications.ts # Notification system
├── database.ts         # Database operations
└── supabase.ts        # Database connection
```

## 🎯 **For Junior Developers: Key Principles**

### 1. **Adding New Pages**
```bash
# Create a new route: /profile
app/
└── profile/
    └── page.tsx
```

### 2. **Adding New Components**
```bash
# Create a new feature component
components/
└── features/
    └── user-profile/
        ├── index.tsx
        ├── UserProfile.tsx
        └── UserProfile.test.tsx
```

### 3. **Adding Validation**
```bash
# Add new validation schema
lib/schemas/
└── new-feature.schema.ts
```

## 🚀 **Quick Start for New Features**

### Creating a New Feature: Step-by-Step

1. **Create the page** in `/app/[feature-name]/page.tsx`
2. **Add validation** in `/lib/schemas/[feature].schema.ts`
3. **Create components** in `/components/features/[feature-name]/`
4. **Add types** in `/lib/types/index.ts`
5. **Add utilities** in `/lib/utils/[feature].ts`

### Example: Adding a "Settings" Feature
```bash
# 1. Create the route
app/settings/page.tsx

# 2. Create validation
lib/schemas/settings.schema.ts

# 3. Create components
components/features/settings/
├── SettingsForm.tsx
└── SettingsCard.tsx

# 4. Add types
# Update: lib/types/index.ts

# 5. Add utilities
lib/utils/settings.ts
```

## 📋 **File Naming Conventions**

- **Pages**: `page.tsx` (always lowercase)
- **Components**: `PascalCase.tsx` (e.g., `UserCard.tsx`)
- **Utilities**: `camelCase.ts` (e.g., `formatDate.ts`)
- **Types**: `PascalCase.ts` (e.g., `User.ts`)
- **Schemas**: `[feature].schema.ts`

## 🔧 **Common Patterns**

### Form Validation Pattern
```typescript
// 1. Define schema in lib/schemas/
const userSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email format")
});

// 2. Use in component with field errors
const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
```

### Notification Pattern
```typescript
// Show success/error messages
notificationManager.showNotification({
  type: 'success',
  title: 'Success!',
  message: 'Your action completed successfully'
});
```

## 🎓 **Learning Path for Junior Devs**

1. **Start with**: Understanding `/app/page.tsx`
2. **Learn**: How `/app/layout.tsx` wraps everything
3. **Practice**: Creating simple components in `/components/ui/`
4. **Advance**: Building features in `/components/features/`
5. **Master**: Adding validation in `/lib/schemas/`

## ❓ **Need Help?**

- **Can't find a file?** Check the correct folder based on its purpose
- **Not sure where to put something?** Ask: "Is this UI, logic, or data?"
- **Validation errors?** Look in `/lib/schemas/` first
- **Styling issues?** Check `/components/ui/` for consistent patterns

This structure grows with you - start simple, add complexity as needed! 🌱