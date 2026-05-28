const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Mock data for testing
const mockData = {
  tasks: [
    { id: '1', name: 'KS Museum Script (Chinese translation)', status: 'In Progress', department: 'Production', assignee: 'Bradley', dueDate: '2026-06-15', completion: 65 },
    { id: '2', name: 'Power automate premium stuff', status: 'In Progress', department: 'Digital', assignee: 'Hwei', dueDate: '2026-06-20', completion: 40 },
    { id: '3', name: 'Visitor centre content', status: 'Planning', department: 'Branding', assignee: 'Fran', dueDate: '2026-07-01', completion: 20 },
    { id: '4', name: 'KS Museum QR Quotes', status: 'In Progress', department: 'Production', assignee: 'Bradley', dueDate: '2026-06-10', completion: 85 },
    { id: '5', name: 'SPRINT Update moving forward', status: 'Blocked', department: 'Digital', assignee: 'Hwei', dueDate: '2026-06-30', completion: 30 },
    { id: '6', name: 'LEAD 2026', status: 'In Progress', department: 'Branding', assignee: 'Fran', dueDate: '2026-07-15', completion: 50 },
    { id: '7', name: 'Chapman content', status: 'Planning', department: 'Digital', assignee: 'Bradley', dueDate: '2026-06-25', completion: 15 },
    { id: '8', name: 'LUNCH TIME Conversations', status: 'In Progress', department: 'Branding', assignee: 'Fran', dueDate: '2026-06-05', completion: 75 },
  ],
  stats: {
    total: 8,
    inProgress: 5,
    blocked: 1,
    completed: 0
  }
};

app.get('/api/tasks', (req, res) => {
  res.json(mockData);
});

app.get('/api/stats', (req, res) => {
  res.json(mockData.stats);
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running with mock data' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Using MOCK DATA mode');
});
