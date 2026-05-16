# JJMC_Application

Software Engineering 1 Final Project
- Merged branch between meky and test-databaseConfig

# Database roles for reference: 
- client-staff
- bookkeeper
- admin

# Updated files:
# src/services/adminBackendService.js
- Fixed bookkeeper account creation fallback by awaiting the backend request.
- Allows the app to try the secondary Firebase Auth fallback when the standalone backend fails.

# src/pages/AdminOnly/ManageAccountsAdmin.jsx
- Improved account grouping by role: Client Staff, Bookkeeper, and Admin.
- Removed the top admin account counter because only one admin is expected.
- Kept the Admin Accounts table visible without showing a count badge.
- Added clearer role badges, user IDs, and section descriptions.

# src/pages/AdminOnly/BookkeeperAccountsAdmin.jsx
- Moved Existing Bookkeepers below the create-bookkeeper form.
- Added a clearer Existing Bookkeepers section.
- Added the Position column to the bookkeeper table.
- Added temporary password strength detection with Weak, Fair, and Strong labels.

# src/pages/AdminOnly/SystemMonitorAdmin.jsx
- Added Payroll Activity monitoring.
- Added a line graph for pending, rejected, approved, and sent payroll drafts.
- Added a timestamp showing when monitor data was last refreshed.
- Replaced the horizontal bar graph with a grouped Draft Checker.
- Drafts are grouped by payroll status: Pending, Rejected, Approved, Sent, and Other if needed.
- Each draft item only shows the draft name and file type.
- Uses existing draft fields like name, draftName, fileName, filename, clientName, or company for the display name.
- Detects file type from fileType, type, mimeType, file extension, or CSV-related draft data.

# src/pages/AdminOnly/AdminPages.css
- Added styling for bordered account sections and improved table readability.
- Added styling for role badges, user count badges, and user ID cells.
- Added styling for the password strength meter.
- Added styling for the System Monitor payroll line graph.
- Added Draft Checker styling beside the donut chart.
- Added grouped draft list layout, file type badges, empty group text, and scroll support for long draft lists.
