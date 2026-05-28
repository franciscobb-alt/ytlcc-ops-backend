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

// Clean task names - remove timestamps and URLs
const cleanTaskName = (name) => {
  if (!name) return '';
  // Remove ISO timestamps (2026-06-05T06:54:00.000Z format)
  name = name.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?/g, '');
  // Remove URLs (http/https links)
  name = name.replace(/https?:\/\/[^\s]+/g, '');
  // Remove "To create..." descriptions at the end
  name = name.replace(/To\s+create\s+[a-zA-Z\s]+$/i, '');
  // Clean up extra whitespace
  name = name.trim().replace(/\s+/g, ' ');
  return name;
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
    name: cleanTaskName(extractText(props['Task Name']?.title || [])),
    status: mapStatus(statusName),
    department: props['Department']?.select?.name || '',
    assignee: extractText(props['Person/Context']?.rich_text || []) || 'Unassigned',
    dueDate: props['Due Date']?.date?.start || null,
    completion: completion,
    notes: extractText(props['Notes']?.rich_text || []),
    workstream: props['Workstream']?.select?.name || '',
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

app.get('/api/debug', async (req, res) => {
  try {
    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      page_size: 1,
    });
    if (response.results.length === 0) {
      return res.json({ message: 'No tasks found' });
    }
    const firstTask = response.results[0];
    res.json({
      taskName: firstTask.properties['Task Name'],
      status: firstTask.properties['Status'],
      department: firstTask.properties['Department'],
      personContext: firstTask.properties['Person/Context'],
      workstream: firstTask.properties['Workstream'],
      notes: firstTask.properties['Notes'],
      dueDate: firstTask.properties['Due Date'],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Connected to Notion database');
});
