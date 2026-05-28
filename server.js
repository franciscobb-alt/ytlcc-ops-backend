const express = require('express');
const cors = require('cors');
const { Client } = require('@notionhq/client');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Initialize Notion client
const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

// Map Notion status values to dashboard statuses
const mapStatus = (notionStatus) => {
  if (!notionStatus) return 'Backlog';
  const status = notionStatus.toLowerCase();
  if (status.includes('in progress')) return 'In Progress';
  if (status.includes('done')) return 'Done';
  if (status.includes('review')) return 'Review';
  if (status.includes('backlog')) return 'Backlog';
  return notionStatus;
};

// Extract text from Notion rich text
const extractText = (richTextArray) => {
  if (!richTextArray) return '';
  return richTextArray.map(block => block.plain_text).join('');
};

// Parse Notion task row into dashboard format
const parseNotionTask = (page) => {
  const props = page.properties;
  
  // Calculate completion based on status
  const statusName = props['Status']?.status?.name || 'Backlog';
  let completion = 0;
  if (statusName === 'Done') completion = 100;
  else if (statusName === 'In Progress') completion = 50;
  else if (statusName === 'Review') completion = 75;

  return {
    id: page.id,
    name: extractText(props['Task Name']?.title || []),
    status: mapStatus(statusName),
    department: extractText(props['Department']?.rich_text || []),
    assignee: extractText(props['Person/Context']?.rich_text || []) || 'Unassigned',
    dueDate: props['Due Date']?.date?.start || null,
    completion: completion,
    notes: extractText(props['Notes']?.rich_text || []),
    workstream: extractText(props['Workstream']?.rich_text || []),
  };
};

// Fetch tasks from Notion
const fetchNotionTasks = async () => {
  try {
    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      page_size: 100,
    });

    const tasks = response.results.map(parseNotionTask);
    return tasks;
  } catch (error) {
    console.error('Error fetching from Notion:', error.message);
    throw error;
  }
};

// Calculate stats from tasks
const calculateStats = (tasks) => {
  return {
    total: tasks.length,
    inProgress: tasks.filter(t => t.status === 'In Progress').length,
    blocked: tasks.filter(t => t.status === 'Blocked').length,
    completed: tasks.filter(t => t.status === 'Done').length,
  };
};

// API endpoints
app.get('/api/tasks', async (req, res) => {
  try {
    const tasks = await fetchNotionTasks();
    const stats = calculateStats(tasks);
    res.json({ tasks, stats });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks from Notion', details: error.message });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const tasks = await fetchNotionTasks();
    const stats = calculateStats(tasks);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats from Notion', details: error.message });
  }
});

app.get('/health', async (req, res) => {
  try {
    // Test Notion connection
    await notion.databases.retrieve({ database_id: DATABASE_ID });
    res.json({ status: 'ok', message: 'Backend is running and connected to Notion' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Notion connection failed', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Connected to Notion database');
});
