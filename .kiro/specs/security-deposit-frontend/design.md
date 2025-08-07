# Design Document

## Overview

The Security Deposit Pool Frontend is a minimal React/Next.js application that enables users to connect their Ethereum wallets and deposit USDT into a security deposit pool contract. The application follows a clean, minimal design with a black background and focuses on essential functionality without unnecessary UI elements.

The application implements a state-driven architecture where the UI responds to wallet connection status, deposit status, and transaction states. It uses RainbowKit for wallet connectivity and ethers.js for blockchain interactions.

## Architecture

### Technology Stack
- **Frontend Framework**: Next.js 15 with React 19
- **Styling**: Tailwind CSS for minimal, responsive design
- **Wallet Connection**: RainbowKit (@rainbow-me/rainbowkit)
- **Blockchain Interaction**: ethers.js (via RainbowKit's wagmi integration)
- **Contract Types**: @hell-month/security-deposit-sdk for SecurityDepositPool types
- **State Management**: React hooks for local component state

### Application Flow
```mermaid
graph TD
    A[App Load] --> B[Initialize RainbowKit]
    B --> C{Wallet Connected?}
    C -->|No| D[Show Connect Button]
    C -->|Yes| E[Check Network]
    E --> F{Ethereum Mainnet?}
    F -->|No| G[Prompt Network Switch]
    F -->|Yes| H[Poll Deposit Status]
    H --> I{Has Deposited?}
    I -->|Yes| J[Show "Deposited"]
    I -->|No| K[Show Approve/Deposit Buttons]
    K --> L[Handle User Actions]
    L --> M[Update UI State]
    M --> H
```

## Components and Interfaces

### Main Page Component (`src/app/page.tsx`)
The primary component that orchestrates the entire application flow.

**State Management:**
- `isConnected`: Boolean indicating wallet connection status
- `userAddress`: Connected wallet address
- `hasDeposited`: Boolean from contract's hasDeposited mapping
- `approvalStatus`: Enum ('idle', 'pending', 'approved', 'failed')
- `depositStatus`: Enum ('idle', 'pending', 'success', 'failed')
- `error`: Error message for popup display

**Key Methods:**
- `checkDepositStatus()`: Polls the hasDeposited mapping every 30 seconds
- `handleApprove()`: Initiates USDT approval transaction
- `handleDeposit()`: Calls the security deposit contract's deposit function
- `showErrorPopup()`: Displays error messages to user

### Wallet Connection Component
Utilizes RainbowKit's built-in ConnectButton component with custom styling to match the minimal black theme.

### Status Display Component
Shows current deposit status with appropriate messaging:
- "Connect Wallet" (when disconnected)
- "Deposited" (when user has already deposited)
- Action buttons (when user needs to approve/deposit)

### Action Buttons Component
Renders approve and deposit buttons with loading states and proper enable/disable logic.

### Error Popup Component
Modal component for displaying transaction errors with user-friendly messaging.

## Data Models

### Application State Interface
```typescript
interface AppState {
  isConnected: boolean;
  userAddress: string | null;
  hasDeposited: boolean;
  approvalStatus: 'idle' | 'pending' | 'approved' | 'failed';
  depositStatus: 'idle' | 'pending' | 'success' | 'failed';
  error: string | null;
}
```

### Contract Configuration
```typescript
interface ContractConfig {
  securityDepositPoolAddress: string; // From environment variable
  usdtAddress: string; // USDT contract address on Ethereum mainnet
  chainId: number; // Ethereum mainnet (1)
}
```

### Transaction State
```typescript
interface TransactionState {
  hash?: string;
  isLoading: boolean;
  error?: string;
}
```

## Error Handling

### Network Errors
- **Wrong Network**: Prompt user to switch to Ethereum mainnet
- **RPC Errors**: Display user-friendly message and suggest retry
- **Connection Lost**: Show reconnection prompt

### Transaction Errors
- **Insufficient Balance**: Clear error message about USDT balance
- **Gas Estimation Failed**: Suggest adjusting gas settings
- **User Rejection**: Silent handling, no error popup
- **Contract Revert**: Parse revert reason and display meaningful message

### Contract Interaction Errors
- **Contract Not Found**: Fallback to environment variable address
- **ABI Mismatch**: Log technical error, show generic message to user
- **Polling Failures**: Continue polling with exponential backoff

## Testing Strategy

### Unit Testing
- Component rendering with different states
- State transitions and button enable/disable logic
- Error handling and popup display
- Contract interaction mocking

### Integration Testing
- Wallet connection flow
- Contract interaction with test network
- Error scenarios with network issues
- State persistence across component re-renders

### End-to-End Testing
- Complete deposit flow from wallet connection to success
- Error handling with real network conditions
- Cross-browser compatibility testing
- Mobile responsiveness testing

## UI/UX Design Specifications

### Color Scheme
- **Background**: Pure black (#000000)
- **Text**: White (#FFFFFF) for primary text
- **Buttons**: 
  - Primary: White background with black text
  - Disabled: Gray (#666666) background with darker gray text
  - Loading: Spinner animation with white color

### Typography
- **Font Family**: System font stack for optimal performance
- **Font Sizes**: 
  - Headings: 24px
  - Body text: 16px
  - Button text: 14px
- **Font Weights**: Regular (400) and Medium (500)

### Layout
- **Container**: Centered layout with max-width constraint
- **Spacing**: Consistent 16px margins and padding
- **Button Sizing**: Minimum 44px height for touch accessibility
- **Border Radius**: 8px for buttons and modals

### Responsive Design
- **Mobile First**: Optimized for mobile devices
- **Breakpoints**: Standard Tailwind breakpoints
- **Touch Targets**: Minimum 44px for interactive elements

### Loading States
- **Button Spinners**: Inline loading indicators
- **Disabled States**: Visual feedback for non-interactive elements
- **Progress Indication**: Clear status messaging during transactions

### Error Display
- **Modal Popup**: Centered overlay with error details
- **Dismissible**: Click outside or close button to dismiss
- **Retry Actions**: Where applicable, provide retry functionality