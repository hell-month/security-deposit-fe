# Requirements Document

## Introduction

This feature implements a minimal frontend interface for users to pay deposits to a security deposit pool contract on the Ethereum network. The application provides wallet connection capabilities, deposit status checking, and a two-step deposit process (approve + deposit) with appropriate user feedback and loading states.

## Requirements

### Requirement 1

**User Story:** As a user, I want to connect my Ethereum wallet to the application, so that I can interact with the security deposit pool contract.

#### Acceptance Criteria

1. WHEN the application loads THEN the system SHALL display a RainbowKit wallet connection button
2. WHEN a user clicks the connect button THEN the system SHALL prompt the user to connect their wallet
3. WHEN a wallet is connected THEN the system SHALL ensure the network is set to Ethereum mainnet
4. IF the user is not on Ethereum mainnet THEN the system SHALL prompt them to switch networks

### Requirement 2

**User Story:** As a connected user, I want to see if I have already paid the deposit, so that I don't attempt to pay twice.

#### Acceptance Criteria

1. WHEN a wallet is connected THEN the system SHALL check the hasDeposited mapping for the user's address
2. WHEN checking deposit status THEN the system SHALL poll the contract every 30 seconds
3. IF the user has already deposited THEN the system SHALL display "Deposited" status
4. WHEN the contract address is not available THEN the system SHALL use an environment variable as fallback

### Requirement 3

**User Story:** As a user who hasn't deposited, I want to approve USDT spending, so that I can proceed with the deposit.

#### Acceptance Criteria

1. WHEN the user hasn't deposited THEN the system SHALL display an "Approve" button
2. WHEN the user clicks "Approve" THEN the system SHALL initiate USDT contract approval
3. WHEN approval is in progress THEN the system SHALL show a loading spinner inside the button
4. WHEN approval is in progress THEN the system SHALL disable both approve and deposit buttons
5. IF approval fails THEN the system SHALL display an error popup to the user
6. WHEN approval succeeds THEN the system SHALL disable the approve button and enable the deposit button

### Requirement 4

**User Story:** As a user with approved USDT, I want to deposit to the security pool, so that I can complete the deposit process.

#### Acceptance Criteria

1. WHEN approval hasn't been completed THEN the system SHALL keep the deposit button disabled
2. WHEN the user clicks "Deposit" THEN the system SHALL call the deposit function on the security deposit contract
3. WHEN deposit is in progress THEN the system SHALL show a loading spinner inside the button
4. WHEN deposit is in progress THEN the system SHALL disable the deposit button
5. IF deposit fails THEN the system SHALL display an error popup to the user
6. WHEN deposit succeeds THEN the system SHALL update the UI to show "Deposit successful"

### Requirement 5

**User Story:** As a user, I want a clean and minimal interface, so that I can focus on the deposit process without distractions.

#### Acceptance Criteria

1. WHEN the application loads THEN the system SHALL display a plain black background
2. WHEN rendering UI elements THEN the system SHALL use appropriate colors, margins, and padding
3. WHEN displaying text THEN the system SHALL use readable fonts and appropriate sizing
4. WHEN showing buttons THEN the system SHALL use consistent border weights and radius
5. WHEN arranging elements THEN the system SHALL use logical flex positioning
6. WHEN the application loads THEN the system SHALL remove any unnecessary Next.js default content

### Requirement 6

**User Story:** As a user, I want clear feedback during transactions, so that I understand the current state of my deposit process.

#### Acceptance Criteria

1. WHEN any transaction is processing THEN the system SHALL show appropriate loading indicators
2. WHEN an error occurs THEN the system SHALL display a popup with error details
3. WHEN buttons are disabled THEN the system SHALL provide visual indication of the disabled state
4. WHEN state changes occur THEN the system SHALL update the UI immediately to reflect the new state