require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const  OpenAIApi  = require("openai");
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
;

// OpenAI SDK setup
const openai = new OpenAIApi({
    organization: '###',
    apiKey: '#', // Ensure you have set your OpenAI API key in .env
  });
// Route to generate summary with OpenAI
app.post('/generateSummary', async (req, res) => {
  const { content } = req.body;
  try {
    const summary = await generateSummary(content);
    res.json({ summary });
  } catch (error) {
    res.status(500).json({ error: 'Error generating summary' });
  }
});
// Function to generate summary with OpenAI
async function generateSummary(content) {
  try {
    const prompt = `Summarize the following content in 100 to 140 words:\n\n${content}`;
    const response = await openai.chat.completions.create({
      model: "gpt-4-1106-preview", // or the latest model you have access to
      messages: [{ role: "user", content: prompt }],
      max_tokens: 400 // Twitter's maximum tweet length
    });
    //console.log('Summary: ', response.choices[0].message.content)
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error with OpenAI API:', error);
    throw error;
  }
}
//Function to perform web scraping
async function scrapeContent(url) {
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    let pageText = '';
    $('p').each((i, el) => {
      pageText += $(el).text() + '\n\n';
    });
    return pageText.trim();
  } catch (error) {
    console.error('Error in scraping:', error);
    return '';
  }
}
// Function to fetch search results and scrape content from each link
async function fetchSearchResults(keyword, numResults) {
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(keyword)}&num=${numResults}`;
  const { data } = await axios.get(searchUrl);
  const $ = cheerio.load(data);
  const links = [];
  // Find the search result links
  $('a').each((i, el) => {
    const link = $(el).attr('href');
    if (link && link.startsWith('/url?q=') && links.length < numResults) {
      links.push(decodeURIComponent(link.split('/url?q=')[1].split('&')[0]));
    }
  });
  return links;
}

// Route to handle search and content generation
app.post('/searchArticles', async (req, res) => {
  const searchQuery = req.body.query;
  const numResults = 3; // Number of search results or tweets to fetch

  try {
    // Step 1: Attempt to fetch recent tweets for the hashtag or search query

      const links = await fetchSearchResults(searchQuery, numResults);
      const articlesPromises = links.map(link => scrapeContent(link));
      content = (await Promise.all(articlesPromises)).join('\n\n---\n\n');

    // Step 3: Respond with the content fetched from either Twitter or Google
    if (content && content.trim() !== '') {
      res.json({ articlesContent: content });
    } else {
      res.status(404).json({ error: 'No relevant content found' });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error fetching content' });
  }
});

// Function to generate content with OpenAI
async function generateTweet(content, tone) {
  try {
    // Construct a prompt prefix based on the selected tone
    const tonePrefix = tone ? `Please generate a ${tone} tone tweet about the following topic: ` : 'Generate a tweet about the following topic: ';
    // Construct the final prompt with tone (if any)
    const prompt = `${tonePrefix}${content}`;
    const response = await openai.chat.completions.create({
      model: "gpt-4-1106-preview", // or the latest model you have access to
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200 // Twitter's maximum tweet length
    });
    //console.log(response.choices[0].message.content)
    return response.choices[0].message.content; // Return the generated tweet
  } catch (error) {
    console.error('Error with OpenAI API:', error);
    throw error; // Rethrow the error to be handled in the endpoint
  }
}
// Route to generate tweet with OpenAI
app.post('/generateTweet', async (req, res) => {
  const content = req.body.content;
  const tone = req.body.tone;
  try {
    const tweet = await generateTweet(content, tone);
    console.log(tweet);
    if (tweet) {
      res.json({ tweet });
    } else {
      res.status(500).json({ error: 'No tweet generated' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error generating tweet' });
  }
});

//https://w3trends.net/pakistan https://w3trends.net/united-states https://w3trends.net/india https://w3trends.net/argentina https://w3trends.net/japan https://w3trends.net/canada
app.get('/api/trends/:country?', async (req, res) => {
  try {
    const country = req.params.country;
    let url;
    if (country === 'global') {
      url = 'https://w3trends.net/?view=full'; // Global trends URL
    } else if (country) {
      url = `https://w3trends.net/${country}`; // Country-specific URL
    } else {
      return res.status(400).send('Country parameter is required');
    }

    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    const trends = [];

    $('li.list-group-item').each((index, element) => {
      const trend = $(element).find('a').text().trim();
      const volume = $(element).find('span.badge').text().trim();
      trends.push({ trend, volume });
    });

    res.json(trends);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching trends');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
