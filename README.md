# Betrix Match Hub

Build a production-quality, responsive Progressive Web App (PWA) called BETRIX, a modern football prediction and sports entertainment platform using virtual credits/points.

I already have the official BETRIX logo. Use the provided BETRIX logo as the primary brand asset throughout the application. Do not redesign or replace the logo.

1. BRAND IDENTITY

Brand:
BETRIX

The visual identity should feel:

Premium

Modern

Bold

Trustworthy

Sport-focused

Technology-driven

Fast

Clean

Professional

Use the BETRIX logo as the source of truth for the brand colors. Build a complete design system around it.

Color system

Use a sophisticated dark sports-tech interface.

Primary:

Deep near-black / charcoal background

BETRIX brand accent color

White

Soft gray

Use the accent color strategically for:

Primary buttons

Active navigation

Selected predictions

Important statistics

Status indicators

Highlights

Avoid excessive use of bright colors.

Use subtle gradients only where they improve the design.

The interface should have excellent contrast and remain easy to read.

2. DESIGN LANGUAGE

The UI should look like a combination of:

Premium football platform + modern fintech dashboard + sports analytics application.

Use:

Rounded but professional cards

Clean spacing

Strong typography hierarchy

Subtle borders

Soft shadows

Minimal gradients

Smooth transitions

Micro-interactions

Skeleton loading states

Empty states

Error states

Responsive layouts

Do NOT make it look like a generic dashboard template.

Every page should feel like it belongs to the same BETRIX ecosystem.

3. PWA

Build the application as a proper PWA.

Include:

Responsive mobile-first design

Desktop optimization

Installable PWA

App manifest

App icon using the BETRIX logo

Splash/loading experience

Service worker

Offline fallback

Fast page transitions

The mobile experience is extremely important.

Design primarily for phones first, then scale elegantly to tablets and desktops.

4. MAIN USER NAVIGATION

Mobile bottom navigation:

Home
Live
Matches
Predictions
Profile

Desktop navigation:

BETRIX logo

Home
Live
Football
Leagues
My Predictions
History

Right side:

Notifications
Profile
Virtual Points Balance

5. HOME PAGE

Create a premium football-focused homepage.

Top section:

BETRIX logo

"Good afternoon"

Virtual Points Balance

Example:

12,450 PTS

Then show:

Live Now

A horizontal/scrollable section of currently active football matches.

Each match card should display:

League

Team logo
Home team
Score
Away team
Match time/status

Example:

Premier League

Manchester United
2 — 1
Arsenal

72'

LIVE

Make live matches visually obvious but not overwhelming.

6. UPCOMING MATCHES

Create a section:

Upcoming Matches

Group matches by:

Today
Tomorrow
Upcoming

Each match card:

League name

Home team
Away team

Kickoff time

Prediction options

Home
Draw
Away

Use compact cards on mobile and larger cards on desktop.

7. LEAGUES

Create a dedicated football leagues page.

Display league cards:

Premier League
La Liga
Serie A
Bundesliga
Ligue 1
Champions League

Each league should have:

League logo
Country
Number of matches
Upcoming fixtures

Allow users to open a league and see:

Fixtures

Results

Standings

Teams

8. MATCH DETAILS

Create a detailed match page.

Header:

League

Home Team
VS
Away Team

Kickoff time

Match status

Then tabs:

Overview
Predictions
Statistics
Lineups
Form

For the prediction section, show available prediction markets as selectable options.

Example:

Match Result

Home
Draw
Away

Total Goals

Over 1.5
Over 2.5
Under 2.5

Both Teams To Score

Yes
No

Selections should have excellent visual feedback.

9. PREDICTION SLIP

Create a professional prediction slip.

Users can add predictions from matches.

The slip should show:

Selected matches

Prediction

Date

Competition

Remove button

At the bottom:

Number of selections

Combined multiplier/score

Potential virtual points

Primary CTA:

CONFIRM PREDICTION

Since this is a virtual-credit platform, clearly label the system as using virtual points, not real money.

10. BOOKING / PREDICTION CODE

Allow users to generate a unique prediction code from their prediction slip.

Example:

BTX-7K29Q

Display:

Prediction Code
BTX-7K29Q

Buttons:

Copy Code
Share Code

Another user can enter a prediction code and load the exact same selections.

Create a page:

Load Prediction Code

Input:

[ BTX-7K29Q ]

[ LOAD PREDICTION ]

Show the loaded predictions before the user confirms them.

11. VIRTUAL POINTS

Create a virtual points system.

Users can receive virtual credits through platform-defined non-monetary mechanisms.

Display their balance prominently:

12,450 PTS

Create:

Points Overview

Current Balance

Points Earned

Points Used

Prediction Results

History

Do not implement real-money deposits, withdrawals, cash payouts, or gambling transactions.

12. USER PROFILE

Create:

Profile

Avatar

Name

Username

Email

Virtual Points

Prediction Statistics

Settings

Notifications

Help & Support

Logout

Statistics:

Predictions Made
Successful Predictions
Accuracy
Favorite League

13. PREDICTION HISTORY

Create a professional history page.

Filters:

All
Won
Lost
Pending

Each prediction card:

Prediction code

Number of selections

Date

Result

Points earned/lost

Allow users to open the prediction and see every selection.

14. ADMIN DASHBOARD

Create a completely separate admin interface.

Admin navigation:

Dashboard
Users
Leagues
Matches
Prediction Codes
Predictions
Partners
Analytics
Notifications
Settings

The admin dashboard should look like a serious SaaS administration platform.

Admin Overview

Cards:

Total Users
Active Users
Predictions Today
Live Matches
Virtual Points Issued
Partner Registrations

Charts:

User registrations
Prediction activity
Popular leagues
Most predicted teams
Daily active users

15. LEAGUE MANAGEMENT

Admin can:

Create league
Edit league
Delete league
Upload league logo
Set country
Activate/deactivate league

Fields:

League name
Country
Logo
Status

16. MATCH MANAGEMENT

Admin can create and manage matches.

Fields:

League
Home team
Away team
Home team logo
Away team logo
Match date
Kickoff time
Status

Statuses:

Scheduled
Live
Finished
Postponed
Cancelled

Allow admin to edit match information.

Important:

Match timing must be controlled by the backend/server time, not the user's browser clock.

Create appropriate validation so incorrect or conflicting match times cannot easily be created.

17. TEAM MANAGEMENT

Admin can:

Create team
Edit team
Delete team
Upload logo
Assign team to league

Fields:

Team name
Short name
Country
Logo
League

18. PREDICTION MANAGEMENT

Admin should be able to configure which prediction markets are available for each match.

Examples:

Match Result
Double Chance
Over/Under
Both Teams To Score

Allow markets to be:

Active
Suspended
Closed

The UI should clearly indicate when a prediction market is unavailable.

19. PARTNER / REFERRAL SYSTEM

Create a partner management system for platform analytics.

Admin can:

Create partner
Generate referral link
Activate/deactivate partner
View referred users
View registration statistics
View activity generated by referrals

Partner dashboard:

Referral link

Total referrals

Registered users

Active users

Predictions made by referred users

Virtual points activity

Conversion statistics

Charts and analytics

Do not implement monetary commissions or revenue-sharing.

20. NOTIFICATIONS

Create a notification system.

Examples:

Prediction result available
Match starting soon
Prediction code loaded
New platform announcement

Notification center should have:

Unread
Read
Mark all as read

21. SEARCH

Create global search.

Users should be able to search:

Teams
Leagues
Matches

Search results should be fast and clean.

22. AUTHENTICATION

Create:

Sign up
Login
Forgot password
Reset password
Email verification

Use proper authentication and authorization.

Roles:

USER
ADMIN
PARTNER

Users must never be able to access admin functionality.

23. DATABASE ARCHITECTURE

Use a proper relational database architecture.

Suggested entities:

User
Profile
Role
League
Team
Match
PredictionMarket
PredictionSelection
PredictionSlip
PredictionCode
PredictionResult
VirtualWallet
PointsTransaction
Partner
Referral
Notification

Use proper relationships, indexes and constraints.

Do not store important business logic only in the frontend.

24. REAL-TIME MATCH EXPERIENCE

Build the architecture so live match information can update without requiring users to refresh the page.

Use:

WebSockets or Server-Sent Events where appropriate.

Live updates can include:

Score
Match status
Match minute
Events

Use clear visual indicators for live updates.

25. SECURITY

Implement:

Authentication
Authorization
Role-based access control
Input validation
Server-side validation
Rate limiting
Secure API routes
Protected admin routes
Secure session handling
Database constraints
Error handling
Audit logs

Never expose secrets or API keys in frontend code.

26. RESPONSIVE DESIGN

Desktop:

Use a professional multi-column layout.

Tablet:

Adapt cards and navigation intelligently.

Mobile:

Use bottom navigation.

Prediction slip should become a convenient bottom-sheet/drawer experience.

Do not simply shrink the desktop UI.

Actually redesign layouts for mobile.

27. ANIMATIONS

Use subtle, professional animations.

Examples:

Page transitions
Card hover
Button feedback
Prediction selection
Live score update
Notification appearance
Bottom sheet transitions

Animations should be fast and subtle.

Avoid excessive animations.

28. LOADING / ERROR / EMPTY STATES

Every data-driven component needs:

Loading skeleton
Empty state
Error state
Retry action

Example:

"No upcoming matches available."

"Something went wrong. Try again."

29. COMPONENT SYSTEM

Create reusable components:

Button
Card
Modal
Drawer
BottomSheet
Tabs
Badge
Avatar
Dropdown
Toast
MatchCard
LeagueCard
TeamCard
PredictionCard
PredictionSlip
StatCard
DataTable
Chart
Pagination
SearchBar
NotificationItem

Keep components reusable and consistent.

30. ADMIN TABLES

Admin tables should support:

Search
Filter
Sort
Pagination
Status badges
Actions

Use confirmation dialogs for destructive actions.

31. ACCESSIBILITY

Ensure:

Keyboard navigation
Proper labels
Readable contrast
Focus states
Semantic HTML
Accessible forms
Screen-reader-friendly controls

32. PERFORMANCE

Prioritize:

Fast initial load
Lazy loading
Optimized images
Code splitting
Caching
Efficient database queries
Pagination
Optimized API calls

The application should feel extremely fast on mobile networks.

33. FINAL VISUAL DIRECTION

The final result should feel like a real commercial sports technology product, not a student project.

Reference qualities:

Premium sportsbook-style information density

Modern fintech dashboard cleanliness

Football analytics aesthetics

Strong mobile UX

Professional SaaS administration interface

But do NOT copy another company's branding, layout or assets.

Create an original BETRIX visual identity.

IMPORTANT

Before implementing the full application:

Establish the design system.

Build the main navigation.

Build the homepage.

Build the match cards.

Build the prediction slip.

Build authentication.

Build the user dashboard.

Build the admin dashboard.

Build the database/API structure.

Connect the pages and functionality.

Test all major user flows.

Ensure the entire application is responsive.

Use realistic football data for development/demo purposes.

Make the interface polished enough that it could serve as the foundation for a professional BETRIX product.

Do not leave major pages as placeholders.

Every major navigation item should lead to a functional page.

Prioritize UX, consistency, responsiveness, performance and visual polish throughout the entire application.
The attachments are the logos. Use them at the right places. Make it professional

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9961b6a7-c60f-4860-9335-11c3343a1168).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
