# CAP Internal Management Application - Summary

## Overview
This is a comprehensive internal management system for CAP (Club Atlético Peñarol), designed to manage multiple aspects of the club's formative divisions including players, staff, inventory, tournaments, and administrative personnel.

## Core Modules

### 1. **Player Management** (`PlayersTab` & `PlayersTabViatico`)
- Complete player database with personal information (name, ID, birth date, position, category)
- Financial tracking: allowances (viáticos), complements, and contracts
- Boarding status (residencia/casita) and meal tracking (viandas)
- Visual name editing capability for display purposes
- Banking information management
- Export functionality to Excel with customizable fields
- Historical tracking of changes to key fields (contrato, viatico, complemento)
- **Change request system**: Users with role `presidente_categoria` must submit requests for approval when modifying financial fields

### 2. **Change Request System** (`ChangeRequestsTab`)
- Approval workflow for player modifications
- Visible to admin, ejecutivo, presidente, and presidente_categoria roles
- Tracks old vs new values for financial fields
- Review notes and approval tracking

### 3. **Staff Management** (`EmployeesTab`)
- Employee database with roles and categories
- Photo management
- Clothing size tracking (upper/lower)
- Government ID management

### 4. **Inventory & Distribution** (`InventoryTab` & `DistributionsTab`)
- Clothing inventory tracking with sizes and quantities
- Low stock alerts
- Distribution management (who received what, when)
- Return tracking
- Authorized personnel tracking
- Item condition monitoring

### 5. **Dirigentes (Board Members)** (`DirigentesTab`)
- Management of club officials and board members
- Role assignment (President, Treasurer, Category President, etc.)
- Category assignments
- Age and contact information
- Vehicle registration tracking

### 6. **Tournaments** (`TorneosTab`)
- Tournament creation and management
- Date and location tracking
- Association of dirigentes, players, and staff to tournaments
- Category-based organization
- Detailed view of tournament participants

### 7. **Commissions** (`ComisionesTab`)
- Committee management
- Assignment of dirigentes to different commissions
- Description and purpose tracking

## Key Features

### Permission System
Role-based access control with granular permissions:
- `can_access_players`: View player information
- `can_edit_players`: Modify player data
- `can_access_viatico`: Access financial/allowance tab
- `can_access_widgets`: View analytics dashboard
- `can_access_dirigentes`: Access board members section
- `can_access_ropa`: Access clothing/inventory system
- `categoria[]`: Array limiting access to specific categories
- Role-based approval workflows (admin, ejecutivo, presidente, presidente_categoria)

### Analytics Dashboard (`OverviewTab`)
When enabled, provides widgets for:
- Birthday tracking
- Spending trends analysis
- Category distribution charts
- Age distribution visualization
- Department/region distribution
- Most distributed items tracking

### Data Export
Excel export functionality across multiple modules with customizable field selection.

### History Tracking
Automatic logging of changes to critical player fields:
- Tracks who made changes
- Records old and new values
- Timestamp tracking
- Viewable history modal

### Multi-language Support
Primarily Spanish interface with Uruguayan localization (date formats, terminology).

## Technical Architecture

### Database Tables
- `players`: Player information and financials
- `player_history`: Change tracking for players
- `player_change_requests`: Approval workflow for modifications
- `employees`: Staff members
- `dirigentes`: Board members/officials
- `inventory`: Clothing items
- `distributions`: Clothing distribution records
- `torneos`: Tournaments
- `torneo_players`, `torneo_dirigentes`, `torneo_funcionarios`: Tournament associations
- `comisiones`: Committees
- `comision_dirigentes`: Committee member assignments
- `user_permissions`: Role-based access control

### Authentication
Supabase-based authentication with email/password for admin users and government ID/employee ID for staff members.

### User Roles
- **Admin/Super User**: Full system access
- **Ejecutivo**: Management-level access
- **Presidente**: Presidential-level access
- **Presidente de Categoría**: Category-specific management with approval requirements
- **Standard User**: Limited view-only access based on permissions

## Unique Capabilities
1. Dual-name system (legal name + visual name for display)
2. Change request approval workflow for financial modifications
3. Integrated tournament management with multi-entity associations
4. Comprehensive clothing distribution tracking
5. Category-based access restrictions
6. Historical audit trail for key data changes