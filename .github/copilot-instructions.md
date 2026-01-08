# Copilot Instructions for feedit

## Project Overview

feedit is a minimal RSS feed reader app built with React Native. The app allows users to add RSS feeds, view feed items, bookmark articles, and manage their subscriptions. The project is currently under heavy development.

## Technology Stack

- **Framework**: React Native 0.81.1
- **Language**: TypeScript
- **UI Library**: React Native Paper
- **State Management**: Zustand
- **Storage**: React Native AsyncStorage with custom chunked implementation
- **Navigation**: React Navigation v7 (Stack and Bottom Tabs)
- **Testing**: Jest with React Test Renderer
- **Build Tools**: Fastlane (Android), Metro bundler
- **Package Manager**: Yarn 4.9.4

## Code Style and Formatting

### Prettier Configuration
- Defined in `.prettierrc.js` (overrides specific properties from base config):
  - `singleQuote: true` - Use single quotes for strings
  - `arrowParens: 'avoid'` - Avoid parentheses around single arrow function parameters (e.g., `x => x + 1`)
  - `trailingComma: 'all'` - Add trailing commas wherever possible
- Base configuration referenced in package.json: `@barelyhuman/prettier-config`

### ESLint Configuration
- Extends: `@react-native`
- Follow React Native community standards

### TypeScript
- Configuration extends: `@react-native/typescript-config`
- Include all `.ts` and `.tsx` files
- Exclude: `node_modules`, `Pods`

## Project Structure

```
src/
├── App.tsx              # Main app component with PaperProvider and Navigation
├── components/          # Reusable UI components
│   ├── AddFeedFAB.tsx
│   ├── FeedItemList.tsx
│   ├── FeedList.tsx
│   ├── FeedRightIcons.tsx
│   ├── FeedSelectIcon.tsx
│   ├── FeedUnreadDot.tsx
│   └── Toast.tsx
├── pages/               # Screen components
│   ├── BookmarksPage.tsx
│   ├── FeedPage.tsx
│   ├── HomePage.tsx
│   └── SettingsPage.tsx
├── navigation/          # Navigation configuration
├── lib/                 # Business logic and utilities
│   ├── store/          # Zustand stores
│   ├── chunkAsyncStore.ts
│   └── url.ts
└── styles/             # Style definitions
```

## Development Guidelines

### Component Conventions
- Use functional components with hooks
- Import React Native components from `react-native` (e.g., `StatusBar`, `useColorScheme`)
- Use React Native Paper components for UI consistency (e.g., `Appbar`, `List`, `TouchableRipple`)
- Extract reusable UI logic into separate components in `components/`
- Page-level components go in `pages/` directory

### State Management
- Use Zustand for global state management
- Access store with hooks: `const value = useFeedStore(state => state.value)`
- Store definitions are in `src/lib/store/`
- **Persistent Storage**: Uses `@react-native-async-storage/async-storage` with a custom chunked implementation (`chunkAsyncStore`)
  - The `chunkAsyncStore` utility (in `src/lib/chunkAsyncStore.ts`) splits large data into 1MB chunks to prevent data loss
  - This prevents hitting AsyncStorage size limits and ensures data persistence
  - Used with Zustand's `persist` middleware via `createJSONStorage(() => chunkAsyncStore)`
  - **IMPORTANT**: Always use `chunkAsyncStore` instead of direct AsyncStorage for Zustand persistence to avoid data loss

### Navigation
- Uses React Navigation v7 with static navigation API
- Navigation is configured with `createStaticNavigation()` in `src/navigation/Navigation.tsx`
- Navigators are defined with `createNativeStackNavigator()` and `createBottomTabNavigator()`
- Within components, use `useNavigation()` hook to access navigation: `const navigation = useNavigation()`
- Navigate with: `navigation.navigate({ name: 'ScreenName', params: { ... } })`

### Styling
- Use React Native Paper's theming system
- Access theme with: `const theme = useTheme()`
- Use `isDarkMode` prop for dark mode support
- Animations use React Native's `Animated` API

### Imports
- Group imports logically: React Native imports, third-party libraries, local imports
- Use relative paths for local imports (e.g., `./components/`, `../lib/`)

## Testing

### Test Framework
- Jest with `react-native` preset
- Use `react-test-renderer` for component testing
- Test files in `__tests__/` directory with `.test.tsx` extension

### Test Conventions
- Use `ReactTestRenderer.act()` for async operations
- Example: `await ReactTestRenderer.act(() => { ReactTestRenderer.create(<Component />) })`
- Include `@format` JSDoc comment at the top of test files

## Build and Development Commands

```bash
# Development
yarn start              # Start Metro bundler
yarn android            # Run on Android device/emulator
yarn ios               # Run on iOS device/simulator

# Code Quality
yarn lint              # Run ESLint
yarn fix               # Format code with Prettier
yarn test              # Run Jest tests

# Build
bundle exec fastlane android build    # Build Android APK

# Dependencies
yarn                   # Install dependencies
yarn prepare          # Run patch-package after install
```

## Platform-Specific Notes

### Android
- Builds use Fastlane
- Output APKs go to `./dist/android/`
- Uses Gradle for native builds
- Requires Java 18 (configured in mise.toml)

### iOS
- React Native 0.81.1 compatible
- Uses CocoaPods for dependency management

## Dependencies Management

- Use Yarn 4.9.4 (configured in `packageManager` field)
- Enable corepack: `corepack enable`
- Patches are managed via `patch-package` (run automatically on install)

## Best Practices

1. **State Updates**: Use Zustand store methods for state management, avoid direct mutations
2. **Async Operations**: Use `useEffect` for side effects (e.g., `sequentialBackgroundSync`)
3. **Type Safety**: Leverage TypeScript types, especially for navigation and store state
4. **Performance**: Use `useRef` for values that don't trigger re-renders (e.g., animations)
5. **UI Consistency**: Use React Native Paper components to maintain consistent design
6. **Dark Mode**: Always consider dark mode support using `useColorScheme()` or `isDarkMode` prop
7. **Code Formatting**: Run `yarn fix` before committing to ensure consistent formatting
8. **Testing**: Write tests for new components following existing patterns in `__tests__/`

## Node.js Requirements

- Node.js version: >=20 (minimum, specified in `engines` field)
- Recommended version: Node.js 24 (configured in `mise.toml`)
- Use mise for version management (see `mise.toml` for exact versions)

## Additional Notes

- The app is under heavy development, expect frequent changes
- Screenshots and assets are in `docs/assets/`
- Fastlane configuration and README are in `fastlane/` directory
- Android-specific code is in `android/` directory
- iOS-specific code is in `ios/` directory
