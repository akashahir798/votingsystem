# VotePoll - Real-Time Polling System

A comprehensive web-based polling system that allows organizers to create polls and voters to cast votes with real-time results visualization.

## Features

### Poll Creation (Organizer)
- Create polls with title and optional description
- Dynamic add/remove poll options
- Single choice or Multi-choice poll types
- Set closing date and time (time-boxed polls)
- Configure Anonymous or Named voting mode

### Voting System (Voter)
- View all active polls
- Cast votes based on poll settings
- Anti-duplication logic using unique user ID
- Prevent duplicate voting for fairness

### Real-Time Results
- Live vote counting without page refresh
- Bar chart visualization using Chart.js
- Percentage calculations
- Socket.io for instant updates

### Poll Management (Organizer Dashboard)
- View all created polls
- Close polls manually
- Automatic poll closure after set time
- View detailed vote counts

### Export & Record Keeping
- Export results in CSV format
- Maintain poll history

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Real-Time**: Socket.io
- **Charts**: Chart.js
- **UI**: Modern responsive design with custom CSS

## Project Structure

```
vote/
├── package.json          # Dependencies
├── server.js             # Main server file
├── public/
│   └── index.html        # Frontend application
└── README.md            # This file
```

## Prerequisites

1. **Node.js** (v14 or higher)
2. **MongoDB** (local installation or MongoDB Atlas)

## Installation

### 1. Clone the repository
```bash
cd vote
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure MongoDB

**Option A: Local MongoDB**
- Install MongoDB from https://www.mongodb.com/try/download/community
- Start MongoDB service
- The app will connect to `mongodb://localhost:27017/pollsystem`

**Option B: MongoDB Atlas (Cloud)**
- Create a free account at https://www.mongodb.com/atlas
- Create a cluster and get the connection string
- Set the connection string as environment variable:
```bash
export MONGODB_URI="your_mongodb_connection_string"
```

### 4. Start the server
```bash
npm start
```

### 5. Open the application
Navigate to: http://localhost:3000

## Usage Guide

### Creating a Poll
1. Click "Create Poll" in the navigation
2. Enter poll title (required)
3. Add optional description
4. Select poll type (Single/Multi choice)
5. Choose voting mode (Named/Anonymous)
6. Set closing time (optional)
7. Add at least 2 options
8. Click "Create Poll"

### Casting a Vote
1. Click "Vote" in the navigation
2. Select an active poll
3. Enter your name and email (if named voting)
4. Select your choice(s)
5. Click "Submit Vote"
6. View real-time results after voting

### Viewing Results
1. Click "Results" in the navigation
2. Select a poll from the dropdown
3. View vote distribution and chart

### Managing Polls (Dashboard)
1. Click "Dashboard" in the navigation
2. View all polls with statistics
3. Actions available:
   - View Results: See detailed poll results
   - Close: Manually close a poll
   - Export: Download CSV export
   - Delete: Remove poll and all votes

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/polls` | Get all active polls |
| GET | `/api/polls/:id` | Get single poll |
| POST | `/api/polls` | Create new poll |
| PUT | `/api/polls/:id` | Update poll |
| POST | `/api/polls/:id/close` | Close poll |
| DELETE | `/api/polls/:id` | Delete poll |
| POST | `/api/vote` | Cast a vote |
| GET | `/api/vote/check/:pollId/:voterId` | Check if user voted |
| GET | `/api/results/:pollId` | Get poll results |
| GET | `/api/export/csv/:pollId` | Export CSV |
| GET | `/api/dashboard/polls` | Get all polls for dashboard |

## Anti-Duplication Mechanism

The system uses multiple methods to prevent duplicate voting:

1. **User ID**: Generated and stored in localStorage for each browser
2. **Voter ID Check**: Each vote is linked to a unique voter ID
3. **Database Validation**: Server checks for existing votes before accepting new ones

This ensures:
- Each user can vote only once per poll
- Same browser cannot vote multiple times
- Results remain fair and accurate

## Real-Time Updates

Socket.io is used for instant updates:
- When a vote is cast, all connected clients receive the update
- Results page automatically refreshes
- No manual refresh needed

## Security Features

- Input validation on server side
- SQL injection prevention (using MongoDB queries)
- CORS enabled for API access
- Vote validation before recording

## Customization

### Changing Port
Edit `server.js` and change the PORT:
```javascript
const PORT = process.env.PORT || 3000; // Change 3000 to your preferred port
```

### MongoDB Connection
Edit the `MONGODB_URI` in `server.js`:
```javascript
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pollsystem';
```

## Screenshots

The application features:
- Modern, clean dashboard interface
- Responsive design for mobile and desktop
- Real-time chart visualization
- Easy poll management

## License

MIT License

## Support

For issues or questions, please check:
1. MongoDB is running
2. All dependencies are installed (`npm install`)
3. Port 3000 is available

---

Built with ❤️ using Node.js, Express, MongoDB, and Socket.io
