const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
const MONGODB_URI = 'mongodb+srv://akashahir798_db_user:q9cLT4L8o8HjEy19@cluster0.pbkczae.mongodb.net/pollsystem?retryWrites=true&w=majority';

// Database Models
const voteSchema = new mongoose.Schema({
  pollId: { type: String, required: true },
  voterId: { type: String, required: true },
  voterName: { type: String },
  voterEmail: { type: String },
  selectedOptions: [{ type: String }],
  votedAt: { type: Date, default: Date.now },
  ipAddress: { type: String }
});

const pollSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String },
  options: [{ type: String }],
  pollType: { type: String, enum: ['single', 'multi'], default: 'single' },
  isAnonymous: { type: Boolean, default: false },
  closingTime: { type: Date },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: String }
});

const Vote = mongoose.model('Vote', voteSchema);
const Poll = mongoose.model('Poll', pollSchema);

// In-memory storage fallback
let polls = new Map();
let votes = new Map();
let useInMemory = true; // Default to in-memory

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB Atlas');
    useInMemory = false;
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    console.log('Using in-memory storage (no MongoDB required)');
    useInMemory = true;
  });

// Helper functions - Unified for both MongoDB and in-memory storage
async function getPoll(pollId) {
  if (useInMemory) {
    return polls.get(pollId) || null;
  }
  return await Poll.findOne({ id: pollId });
}

async function getAllPolls() {
  if (useInMemory) {
    return Array.from(polls.values()).filter(p => p.isActive).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  return await Poll.find({ isActive: true }).sort({ createdAt: -1 });
}

async function createPoll(pollData) {
  const poll = {
    id: uuidv4(),
    title: pollData.title,
    description: pollData.description || '',
    options: pollData.options,
    pollType: pollData.pollType || 'single',
    isAnonymous: pollData.isAnonymous || false,
    closingTime: pollData.closingTime ? new Date(pollData.closingTime) : null,
    isActive: true,
    createdAt: new Date(),
    createdBy: pollData.createdBy || 'anonymous'
  };

  if (useInMemory) {
    polls.set(poll.id, poll);
    return poll;
  }
  
  const newPoll = new Poll(poll);
  await newPoll.save();
  return newPoll;
}

async function updatePoll(pollId, updates) {
  if (useInMemory) {
    const poll = polls.get(pollId);
    if (!poll) return null;
    
    if (updates.title) poll.title = updates.title;
    if (updates.description !== undefined) poll.description = updates.description;
    if (updates.options) poll.options = updates.options;
    if (updates.pollType) poll.pollType = updates.pollType;
    if (updates.isAnonymous !== undefined) poll.isAnonymous = updates.isAnonymous;
    if (updates.closingTime) poll.closingTime = new Date(updates.closingTime);
    if (updates.isActive !== undefined) poll.isActive = updates.isActive;
    
    polls.set(pollId, poll);
    return poll;
  }
  
  const poll = await Poll.findOne({ id: pollId });
  if (!poll) return null;
  
  if (updates.title) poll.title = updates.title;
  if (updates.description !== undefined) poll.description = updates.description;
  if (updates.options) poll.options = updates.options;
  if (updates.pollType) poll.pollType = updates.pollType;
  if (updates.isAnonymous !== undefined) poll.isAnonymous = updates.isAnonymous;
  if (updates.closingTime) poll.closingTime = new Date(updates.closingTime);
  if (updates.isActive !== undefined) poll.isActive = updates.isActive;
  
  await poll.save();
  return poll;
}

async function deletePoll(pollId) {
  if (useInMemory) {
    return polls.delete(pollId);
  }
  const result = await Poll.deleteOne({ id: pollId });
  return result.deletedCount > 0;
}

async function getVotesForPoll(pollId) {
  if (useInMemory) {
    return Array.from(votes.values()).filter(v => v.pollId === pollId);
  }
  return await Vote.find({ pollId });
}

async function createVote(voteData) {
  const vote = {
    id: uuidv4(),
    pollId: voteData.pollId,
    voterId: voteData.voterId,
    voterName: voteData.voterName || null,
    voterEmail: voteData.voterEmail || null,
    selectedOptions: voteData.selectedOptions,
    votedAt: new Date(),
    ipAddress: voteData.ipAddress || ''
  };

  if (useInMemory) {
    votes.set(vote.id, vote);
    return vote;
  }
  
  const newVote = new Vote(vote);
  await newVote.save();
  return newVote;
}

async function hasVoted(pollId, voterId) {
  if (useInMemory) {
    return Array.from(votes.values()).some(v => v.pollId === pollId && v.voterId === voterId);
  }
  const vote = await Vote.findOne({ pollId, voterId });
  return !!vote;
}

async function getPollResults(pollId) {
  const poll = await getPoll(pollId);
  if (!poll) return null;

  const pollVotes = await getVotesForPoll(pollId);
  const totalVotes = pollVotes.length;

  const optionCounts = {};
  poll.options.forEach(opt => {
    optionCounts[opt] = 0;
  });

  pollVotes.forEach(vote => {
    vote.selectedOptions.forEach(opt => {
      if (optionCounts.hasOwnProperty(opt)) {
        optionCounts[opt]++;
      }
    });
  });

  const results = poll.options.map(option => ({
    option,
    count: optionCounts[option],
    percentage: totalVotes > 0 ? ((optionCounts[option] / totalVotes) * 100).toFixed(1) : 0
  }));

  return {
    pollId,
    totalVotes,
    results
  };
}

// API Routes

// Get all active polls
app.get('/api/polls', async (req, res) => {
  try {
    const allPolls = await getAllPolls();
    res.json(allPolls.map(poll => ({
      ...poll.toObject ? poll.toObject() : poll,
      hasVoted: false
    })));
  } catch (error) {
    console.error('Error fetching polls:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a single poll by ID
app.get('/api/polls/:id', async (req, res) => {
  try {
    const poll = await getPoll(req.params.id);
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }
    res.json(poll.toObject ? poll.toObject() : poll);
  } catch (error) {
    console.error('Error fetching poll:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a new poll
app.post('/api/polls', async (req, res) => {
  try {
    const { title, description, options, pollType, isAnonymous, closingTime, createdBy } = req.body;
    
    if (!title || !options || options.length < 2) {
      return res.status(400).json({ error: 'Title and at least 2 options are required' });
    }
    
    const newPoll = await createPoll({
      title,
      description,
      options,
      pollType,
      isAnonymous,
      closingTime,
      createdBy
    });

    res.status(201).json(newPoll.toObject ? newPoll.toObject() : newPoll);
  } catch (error) {
    console.error('Error creating poll:', error);
    res.status(500).json({ error: 'Failed to create poll' });
  }
});

// Update a poll
app.put('/api/polls/:id', async (req, res) => {
  try {
    const { title, description, options, pollType, isAnonymous, closingTime, isActive } = req.body;
    
    const poll = await getPoll(req.params.id);
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    const updatedPoll = await updatePoll(req.params.id, {
      title,
      description,
      options,
      pollType,
      isAnonymous,
      closingTime,
      isActive
    });
    
    res.json(updatedPoll.toObject ? updatedPoll.toObject() : updatedPoll);
  } catch (error) {
    console.error('Error updating poll:', error);
    res.status(500).json({ error: 'Failed to update poll' });
  }
});

// Close a poll manually
app.post('/api/polls/:id/close', async (req, res) => {
  try {
    const poll = await getPoll(req.params.id);
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    poll.isActive = false;
    if (useInMemory) {
      polls.set(req.params.id, poll);
    } else {
      await poll.save();
    }
    res.json(poll.toObject ? poll.toObject() : poll);
  } catch (error) {
    console.error('Error closing poll:', error);
    res.status(500).json({ error: 'Failed to close poll' });
  }
});

// Delete a poll
app.delete('/api/polls/:id', async (req, res) => {
  try {
    const poll = await getPoll(req.params.id);
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    // Delete all votes for this poll
    const pollVotes = await getVotesForPoll(req.params.id);
    if (useInMemory) {
      pollVotes.forEach(vote => votes.delete(vote.id));
    }
    
    await deletePoll(req.params.id);
    res.json({ message: 'Poll deleted successfully' });
  } catch (error) {
    console.error('Error deleting poll:', error);
    res.status(500).json({ error: 'Failed to delete poll' });
  }
});

// Cast a vote
app.post('/api/vote', async (req, res) => {
  try {
    const { pollId, voterId, voterName, voterEmail, selectedOptions, ipAddress } = req.body;

    // Check if poll exists and is active
    const poll = await getPoll(pollId);
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    if (!poll.isActive) {
      return res.status(400).json({ error: 'Poll is closed' });
    }

    // Check if poll has expired
    if (poll.closingTime && new Date() > new Date(poll.closingTime)) {
      poll.isActive = false;
      if (useInMemory) {
        polls.set(pollId, poll);
      } else {
        await poll.save();
      }
      return res.status(400).json({ error: 'Poll has expired' });
    }

    // Validate poll type
    if (poll.pollType === 'single' && selectedOptions.length > 1) {
      return res.status(400).json({ error: 'Single choice poll allows only one option' });
    }

    if (poll.pollType === 'multi' && selectedOptions.length < 1) {
      return res.status(400).json({ error: 'Please select at least one option' });
    }

    // Check for duplicate vote
    if (await hasVoted(pollId, voterId)) {
      return res.status(400).json({ error: 'You have already voted in this poll' });
    }

    // Create new vote
    await createVote({
      pollId,
      voterId,
      voterName: poll.isAnonymous ? null : voterName,
      voterEmail: poll.isAnonymous ? null : voterEmail,
      selectedOptions,
      ipAddress
    });

    // Emit real-time update
    const results = await getPollResults(pollId);
    io.emit('voteUpdate', { pollId, results });

    res.status(201).json({ message: 'Vote recorded successfully', results });
  } catch (error) {
    console.error('Error casting vote:', error);
    res.status(500).json({ error: 'Failed to record vote' });
  }
});

// Check if user has voted
app.get('/api/vote/check/:pollId/:voterId', async (req, res) => {
  try {
    const { pollId, voterId } = req.params;
    const voted = await hasVoted(pollId, voterId);
    res.json({ hasVoted: voted });
  } catch (error) {
    console.error('Error checking vote:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get poll results
app.get('/api/results/:pollId', async (req, res) => {
  try {
    const results = await getPollResults(req.params.pollId);
    if (!results) {
      return res.status(404).json({ error: 'Poll not found' });
    }
    res.json(results);
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

// Export poll results to CSV
app.get('/api/export/csv/:pollId', async (req, res) => {
  try {
    const poll = await getPoll(req.params.pollId);
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    const pollVotes = await getVotesForPoll(req.params.pollId);
    const results = await getPollResults(req.params.pollId);

    let csv = 'Option,Votes,Percentage\n';
    results.results.forEach(r => {
      csv += `"${r.option}",${r.count},${r.percentage}%\n`;
    });

    csv += '\nVoter Details\n';
    if (!poll.isAnonymous) {
      csv += 'Name,Email,Options,Voted At\n';
      pollVotes.forEach(v => {
        csv += `"${v.voterName || ''}","${v.voterEmail || ''}","${v.selectedOptions.join(', ')}","${v.votedAt}"\n`;
      });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=poll_${poll.id}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// Get all polls for organizer dashboard
app.get('/api/dashboard/polls', async (req, res) => {
  try {
    let allPolls;
    if (useInMemory) {
      allPolls = Array.from(polls.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else {
      allPolls = await Poll.find().sort({ createdAt: -1 });
    }
    
    const pollsWithStats = await Promise.all(allPolls.map(async (poll) => {
      const pollVotes = await getVotesForPoll(poll.id);
      const pollObj = poll.toObject ? poll.toObject() : poll;
      return {
        ...pollObj,
        totalVotes: pollVotes.length,
        isExpired: pollObj.closingTime && new Date() > new Date(pollObj.closingTime)
      };
    }));
    res.json(pollsWithStats);
  } catch (error) {
    console.error('Error fetching dashboard polls:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('joinPoll', (pollId) => {
    socket.join(pollId);
    console.log(`User joined poll: ${pollId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Check and close expired polls
setInterval(async () => {
  try {
    let allPolls;
    if (useInMemory) {
      allPolls = Array.from(polls.values());
    } else {
      allPolls = await Poll.find({ isActive: true });
    }
    
    const expiredPolls = allPolls.filter(p => 
      p.isActive && p.closingTime && new Date() > new Date(p.closingTime)
    );

    for (const poll of expiredPolls) {
      poll.isActive = false;
      if (useInMemory) {
        polls.set(poll.id, poll);
      } else {
        await poll.save();
      }
      console.log(`Poll ${poll.id} has been automatically closed`);
    }
  } catch (error) {
    console.error('Error closing expired polls:', error);
  }
}, 60000); // Check every minute

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  if (useInMemory) {
    console.log('Using in-memory storage');
  }
});
