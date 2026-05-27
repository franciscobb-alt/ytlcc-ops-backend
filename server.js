const express = require('express');
const cors = require('cors');
const { Client } = require('@notionhq/client');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

app.get('/api/tasks', async (req, res) => {
  try {
    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      filter: {
        property: 'Status',
        select: {
          does_not_equal: 'Completed'
        }
      }
    });

    const tasks = response.results.map(page => ({
      id: page.id,
      name: page.properties['Task Name']?.title?.[0]?.plain_text || 'Untitled',
      status: page.properties['Status']?.select?.name || 'No status',
      dueDate: page.properties['Due Date']?.date?.start || null,
      department: page.properties['Department']?.select?.name || null,
      workstream: page.properties['Workstream']?.select?.name || null,
      assignee: page.properties['Person/Assignee']?.people?.[0]?.name || 'Unassigned',
      completion: page.properties['Completion %']?.number || 0,
      nextStep: page.properties['Next Step']?.select?.name || null,
      notes: page.properties['Notes']?.rich_text?.[0]?.plain_text || ''
    }));

    res.json({ tasks, total: response.results.length });
  } catch (error) {
    console.error('Notion API error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const response = await notion.databases.query({
      database_id: DATABASE_ID
    });

    const tasks = response.results;
    const inProgress = tasks.filter(t => t.properties['Status']?.select?.name === 'In Progress').length;
    const blocked = tasks.filter(t => t.properties['Status']?.select?.name === 'Blocked').length;
    const completed = tasks.filter(t => t.properties['Status']?.select?.name === 'Completed').length;

    res.json({
      total: tasks.length,
      inProgress,
      blocked,
      completed
    });
  } catch (error) {
    console.error('Notion API error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
