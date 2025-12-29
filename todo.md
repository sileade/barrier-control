# Barrier Control System - TODO

## Core Features
- [x] User authorization with role-based access (admin/user)
- [x] Database schema for vehicles, passages, and medical records
- [x] CRUD operations for allowed vehicle license plates (admin panel)
- [x] Passage logging with timestamp, license plate, and photo
- [x] API endpoint for medical database integration (driver name + plate)
- [x] Real-time video stream display from IP camera
- [x] Manual barrier opening button with confirmation prompt
- [x] OpenAI Vision API integration for license plate recognition
- [x] Automatic barrier opening for recognized allowed plates
- [x] Monitoring dashboard with passage history and statistics
- [x] Owner notifications for unknown plates and unauthorized access

## UI Components
- [x] Dashboard layout with sidebar navigation
- [x] Vehicle management page (CRUD)
- [x] Passage logs page with filtering
- [x] Camera view with live stream
- [x] Barrier control panel
- [x] Statistics and analytics view
- [x] Settings page for camera URL configuration

## API Endpoints
- [x] vehicles.list - Get all allowed vehicles
- [x] vehicles.create - Add new vehicle
- [x] vehicles.update - Update vehicle info
- [x] vehicles.delete - Remove vehicle
- [x] passages.list - Get passage history
- [x] passages.create - Log new passage
- [x] medicalDb.lookup - Query medical database
- [x] medicalDb.sync - Sync with medical database
- [x] barrier.open - Manual barrier control
- [x] recognition.analyze - Analyze image for plate
- [x] settings.get/update - System settings

## Testing
- [x] Unit tests for vehicle CRUD operations
- [x] Unit tests for passage logging
- [x] Unit tests for barrier control flow
- [ ] Integration tests for plate recognition (requires camera)

## Email Notifications Feature
- [x] Create email notification service for unknown vehicles
- [x] Integrate notification into recognition flow
- [x] Add notification settings UI (enable/disable, email address)
- [x] Write unit tests for notification feature

## Telegram Bot Integration
- [x] Create Telegram notification service
- [x] Add bot token and chat ID settings
- [x] Integrate Telegram notifications with existing notification flow
- [x] Add UI for Telegram configuration in Settings
- [x] Add test notification button
- [x] Write unit tests for Telegram integration

## Blacklist Feature
- [x] Create blacklist table in database schema
- [x] Add CRUD operations for blacklist management
- [x] Integrate blacklist check into recognition flow
- [x] Add enhanced notifications for blacklisted vehicles
- [x] Create Blacklist management page UI
- [x] Add blacklist navigation item to sidebar
- [x] Write unit tests for blacklist feature

## CSV Import/Export Feature
- [x] Create export API endpoint for blacklist
- [x] Create import API endpoint with validation
- [x] Add export button to Blacklist page
- [x] Add import dialog with file upload
- [x] Add preview before import
- [x] Handle duplicates and errors during import
- [x] Write unit tests for import/export

## Quiet Hours Feature
- [x] Create pending_notifications table for storing queued notifications
- [x] Add quiet hours settings (start time, end time, enabled)
- [x] Create notification queue service for accumulating notifications
- [x] Add summary notification sender for end of quiet hours
- [x] Allow critical notifications (high/critical blacklist) to bypass quiet hours
- [x] Update Settings UI with quiet hours configuration
- [x] Write unit tests for quiet hours feature

## Notification History Feature
- [x] Create notification_history table in database schema
- [x] Add API endpoints for listing notification history
- [x] Add resend notification functionality
- [x] Create Notification History page UI with filtering
- [x] Add statistics display (total, sent, pending, failed)
- [x] Add export to CSV functionality
- [x] Add navigation item to sidebar
- [x] Write unit tests for notification history feature
