const express = require("express");
const axios = require("axios");
// const OpenAI = require("openai");
const cheerio = require("cheerio");
const bodyParser = require("body-parser");
const fs = require("fs"); // Add this line
// const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
// const { OpenAIEmbeddings } = require("@langchain/openai");
// const { MemoryVectorStore } = require("langchain/vectorstores/memory");
require("dotenv").config();
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.AIRTABLE_API;
const rapidApiKey = process.env.RAPIDAPI_KEY;

app.use(express.json());
app.use(bodyParser.json());

// Endpoint to get destination ID
app.get("/locations", async (req, res) => {
  console.log("Received request for /locations");

  const cityName = req.query.name;
  const locale = req.query.locale || "en-gb";
  console.log("City name:", cityName);
  console.log("Locale:", locale);

  if (!cityName) {
    console.error("City name is required but not provided.");
    return res.status(400).json({ error: "City name is required" });
  }

  const options = {
    method: "GET",
    url: "https://booking-com.p.rapidapi.com/v1/hotels/locations",
    params: { name: cityName, locale: locale },
    headers: {
      "x-rapidapi-host": "booking-com.p.rapidapi.com",
      "x-rapidapi-key": rapidApiKey,
    },
  };

  try {
    console.log("Fetching destination ID from API...");
    const response = await axios.request(options);
    console.log("Received response from API:", response.data);
    res.json(response.data);
  } catch (error) {
    console.error("Error getting destination ID:", error.message);
    res
      .status(500)
      .json({ error: "An error occurred while fetching the destination ID" });
  }
});

// Endpoint to search for hotels
app.get("/search-hotels", async (req, res) => {
  console.log("Received request for /search-hotels");

  const {
    checkout_date,
    order_by = "popularity",
    filter_by_currency = "AED",
    include_adjacency = true,
    children_number = 2,
    categories_filter_ids = "class::2,class::4,free_cancellation::1",
    room_number = 1,
    dest_id,
    dest_type = "city",
    adults_number = 2,
    page_number = 0,
    checkin_date,
    locale = "en-gb",
    units = "metric",
    children_ages = "5,0",
  } = req.query;

  console.log("Search parameters:", {
    checkout_date,
    order_by,
    filter_by_currency,
    include_adjacency,
    children_number,
    categories_filter_ids,
    room_number,
    dest_id,
    dest_type,
    adults_number,
    page_number,
    checkin_date,
    locale,
    units,
    children_ages,
  });

  if (!dest_id || !checkin_date || !checkout_date) {
    console.error(
      "Missing required parameters: dest_id, checkin_date, and/or checkout_date."
    );
    return res
      .status(400)
      .json({ error: "dest_id, checkin_date, and checkout_date are required" });
  }

  const options = {
    method: "GET",
    url: "https://booking-com.p.rapidapi.com/v1/hotels/search",
    params: {
      checkout_date,
      order_by,
      filter_by_currency,
      include_adjacency,
      children_number,
      categories_filter_ids,
      room_number,
      dest_id,
      dest_type,
      adults_number,
      page_number,
      checkin_date,
      locale,
      units,
      children_ages,
    },
    headers: {
      "x-rapidapi-host": "booking-com.p.rapidapi.com",
      "x-rapidapi-key": rapidApiKey,
    },
  };

  try {
    console.log("Searching for hotels...");
    const response = await axios.request(options);
    console.log("Received response from API:", response.data);
    res.json(response.data);
  } catch (error) {
    console.error("Error searching for hotels:", error.message);
    res
      .status(500)
      .json({ error: "An error occurred while searching for hotels" });
  }
});

app.post("/fetchRecords", async (req, res) => {
  try {
    const { base_id, table_name } = req.body;
    if (!base_id || !table_name) {
      return res.status(400).json({ message: "Missing base_id or table_name" });
    }

    const url = `https://api.airtable.com/v0/${base_id}/${table_name}`;
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
    });

    return res.status(200).json({ records: response.data.records });
  } catch (error) {
    console.error("Error fetching data:", error);
    return res.status(500).json({ message: "Error fetching data" });
  }
});

app.post("/searchFlights", async (req, res) => {
  try {
    const { departure_id, arrival_id, outbound_date, return_date, currency } =
      req.body;

    if (
      !departure_id ||
      !arrival_id ||
      !outbound_date ||
      !return_date ||
      !currency
    ) {
      return res.status(400).json({ message: "Missing required parameters" });
    }

    const SERP_API = process.env.SERP_API;
    const url = `https://serpapi.com/search?engine=google_flights&departure_id=${departure_id}&arrival_id=${arrival_id}&outbound_date=${outbound_date}&return_date=${return_date}&currency=${currency}&hl=en&api_key=${SERP_API}`;

    const response = await axios.get(url, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    res.status(200).json(response.data);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching flight data", error: error.message });
  }
});

app.post("/searchPlaces", async (req, res) => {
  try {
    const { query, ll } = req.body;

    if (!query) {
      return res
        .status(400)
        .json({ message: "Missing required parameter: query" });
    }

    const SERP_API = process.env.SERP_API;
    let url = `https://serpapi.com/search?engine=google_maps&q=${encodeURIComponent(
      query
    )}&type=search&api_key=${SERP_API}`;

    if (ll) {
      url += `&ll=${encodeURIComponent(ll)}`;
    }

    const response = await axios.get(url, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    res.status(200).json(response.data);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching place data", error: error.message });
  }
});

app.post("/search", async (req, res) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res
        .status(400)
        .json({ message: "Missing required parameter: query" });
    }

    const SERP_API = process.env.SERP_API;
    const url = `https://serpapi.com/search?engine=google&q=${encodeURIComponent(
      query
    )}&api_key=${SERP_API}`;

    const response = await axios.get(url, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    res.status(200).json(response.data);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching data", error: error.message });
  }
});

// let openai = new OpenAI({
//   baseURL: "https://api.groq.com/openai/v1",
//   apiKey: process.env.GROQ_API_KEY,
// });

// async function getChatSession() {
//   const options = {
//     method: "POST",
//     url: "https://api.on-demand.io/chat/v1/sessions",
//     headers: {
//       accept: "application/json",
//       "content-type": "application/json",
//       apikey: process.env.ondemand_api_key,
//     },
//     data: { externalUserId: "HackBrokers" },
//   };

//   const response = await axios(options);
//   console.log(response.data);
//   return response?.data?.data?.id;
// }

// const summarizeContent = async (content) => {
//   const url = "https://api.openai.com/v1/chat/completions";
//   const headers = {
//     "Content-Type": "application/json",
//     Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
//   };
//   const data = {
//     model: "gpt-4o",
//     messages: content,
//   };

//   try {
//     const response = await axios.post(url, data, { headers });
//     return response.data?.choices || [];
//   } catch (error) {
//     console.error("Error summarizing content:", error.message);
//     throw error; // Ensure calling function is aware of failure
//   }
// };

app.post("/v2/serper", async (req, res) => {
  const { message } = req.body;

  try {
    // Step 1: Fetch search results
    const serpApiConfig = {
      method: "post",
      url: "https://google.serper.dev/images",
      headers: {
        "X-API-KEY": process.env.SERP_API_PERPLEXITY,
        "Content-Type": "application/json",
      },
      data: JSON.stringify({ q: message, num: "10" }),
    };

    const serpResponse = await axios(serpApiConfig);
    const { images } = serpResponse.data;

    // Step 2: Parse sources
    const sourcesParsed = images.map((item) => ({
      title: item.title || "No Title",
      link: item.link || "",
      image: item.imageUrl || "",
    }));

    // Step 3: Fetch page content
    const fetchPageContent = async (link) => {
      try {
        const response = await axios.get(link, { timeout: 5000 });
        const $ = cheerio.load(response.data);

        $("script, style, noscript, iframe, link, meta, a").remove();

        const content = $("body")
          .text()
          .replace(/\s+/g, " ")
          .replace(/[\[\]\(\)]+/g, "")
          .replace(/[^\w\s.,!?-]/g, " ")
          .trim()
          .split(/\s+/)
          .slice(0, 3000)
          .join(" ");

        return { content, link };
      } catch (error) {
        console.error(`Failed to fetch content for ${link}:`, error.message);
        return { content: "", link };
      }
    };

    // Step 4: Process content
    const processAndVectorizeContent = async (item) => {
      const { content } = await fetchPageContent(item.link);
      return { ...item, searchResults: content };
    };

    // Step 5: Process all sources
    const sourcesWithContent = (
      await Promise.allSettled(sourcesParsed.map(processAndVectorizeContent))
    )
      .filter(
        (result) => result.status === "fulfilled" && result.value.searchResults
      )
      .map((result) => result.value)
      .slice(0, 5);

    // Step 6: Prepare messages for summarization
    // const summarizedMap = [
    //   {
    //     role: "system",
    //     content: "You are a summarizer which summarizes in 100 words.",
    //   },
    //   ...sourcesWithContent.map((item) => ({
    //     role: "user",
    //     content: item.searchResults,
    //   })),
    // ];

    // // Step 7: Summarize content
    // const summarizedResponses = await summarizeContent(summarizedMap);

    // // Step 8: Update sources with summarized content
    // summarizedResponses.forEach((summary, index) => {
    //   sourcesWithContent[index].searchResults = summary.message.content;
    // });

    // Step 9: Send response
    res.status(200).json({ sourcesWithContent });
  } catch (error) {
    console.error("Error processing request:", error.message);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
      sourcesWithContent: [],
    });
  }
});

// Twillio WhatsApp And SMS
const twilio = require("twilio");
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

app.post("/twilio/send-message", (req, res) => {
  const { body, to } = req.body;
  const from = process.env.TWILIO_PHONE_NUMBER;
  client.messages
    .create({
      body: body,
      from: from,
      to: to,
    })
    .then((message) => res.status(200).send({ sid: message.sid }))
    .catch((error) => res.status(500).send(error));
});

app.post("/twilio/whatsapp", async (req, res) => {
  try {
    const { body, to } = req.body;
    console.log(body, to);

    const response = await client.messages.create({
      // body: body,
      contentSid: "HX4161c13e0a8506431622a23054ec5da7",
      contentVariables: JSON.stringify({ 1: "user", 2: body }),
      from: `whatsapp:+14402524902`,
      to: `whatsapp:${to}`,
    });
    console.log(response);
    return res
      .status(200)
      .json({ message: `Whatsapp message sent successfully to ${to}` });
  } catch (error) {
    console.log("The error in sending message:", error.message);

    return res.status(500).json({ message: `Unable to send whatsapp message` });
  }
});

// Send Grid Plugin
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

app.post("/send-email", async (req, res) => {
  console.log(req.body);
  const { to, subject, text } = req.body;

  if (!to || !subject || !text) {
    return res
      .status(400)
      .send({ error: "Missing required fields: to, subject, text" });
  }
  try {
    const emails = to.split(",").map((email) => email.trim());
    await Promise.all(
      emails.map((email) => {
        const msg = {
          to: email,
          from: "on-demand <info@on-demand.io>",
          subject: subject,
          text: text,
          html: `${text}`,
        };
        sgMail.send(msg);
      })
    );

    return res.status(200).json({
      message: `Email has been sent successfully to the provided ${to}`,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Error sending email",
      error: error.message,
    });
  }
});

app.post("/send-email-with-attachement", async (req, res) => {
  const { to, subject, text, attachments } = req.body;

  if (!to || !subject || !text) {
    return res.status(400).send({
      error: "Missing required fields: to, subject, text",
    });
  }

  try {
    const emails = to.split(",").map((email) => email.trim());

    // Download each attachment and convert to base64
    const attachmentFiles = await Promise.all(
      attachments.map(async (url) => {
        const response = await axios.get(url, { responseType: "arraybuffer" });
        const fileType = response.headers["content-type"];
        const fileName = url.split("/").pop();

        return {
          content: Buffer.from(response.data).toString("base64"),
          filename: fileName,
          type: fileType,
          disposition: "attachment",
        };
      })
    );

    // Send email to each recipient with attachments
    await Promise.all(
      emails.map((email) => {
        const msg = {
          to: email,
          from: "on-demand <info@on-demand.io>",
          subject: subject,
          text: text,
          html: text,
          attachments: attachmentFiles,
        };
        return sgMail.send(msg);
      })
    );

    return res.status(200).json({
      message: `Email has been sent successfully to ${to}`,
    });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).send({
      success: false,
      message: "Error sending email",
      error: error.message,
    });
  }
});

const g2RapidApiHost = process.env.g2_RAPIDAPI_HOST;
const g2RapidApiKey = process.env.g2_RAPIDAPI_KEY;

// Function to trim the response to around 5000 words
const trimResponse = (data) => {
  const words = data.split(/\s+/);
  return words.slice(0, 5000).join(" ");
};

app.get("/update-g2-response", async (req, res) => {
  const productName = req.query.product;
  if (!productName) {
    return res.status(400).json({ error: "Product name is required" });
  }

  const apiUrl = `https://${g2RapidApiHost}/g2-products?product=${encodeURIComponent(
    productName
  )}`;
  try {
    const response = await axios.get(apiUrl, {
      headers: {
        "x-rapidapi-host": g2RapidApiHost,
        "x-rapidapi-key": g2RapidApiKey,
      },
    });
    if (response.status !== 200) {
      throw new Error(`Unexpected response status: ${response.status}`);
    }
    const reducedData = trimResponse(JSON.stringify(response.data));
    res.json({ data: reducedData });
  } catch (error) {
    if (error.response) {
      res
        .status(error.response.status)
        .json({ error: `Failed to fetch data: ${error.response.statusText}` });
    } else if (error.request) {
      // Request was made but no response received
      res.status(502).json({ error: "No response received from the server" });
    } else {
      // Other errors (e.g., setup issues)
      res.status(500).json({ error: `Error: ${error.message}` });
    }
  }
});
const CODACY_HEADERS = (apiToken) => ({
  "Content-Type": "application/json",
  Accept: "application/json",
  "api-token": apiToken, // dynamically set from request header
  caller: "string",
});

async function addRepository(repoFullPath, apiToken) {
  const addRepoUrl = `https://app.codacy.com/api/v3/repositories?api-token=${apiToken}`;
  const data = {
    repositoryFullPath: repoFullPath,
    provider: "gh",
  };

  try {
    const response = await axios.post(addRepoUrl, data, {
      headers: CODACY_HEADERS(apiToken),
    });
    console.log("Repository added:", response.data);
    return true;
  } catch (error) {
    const errorMessage = error.response?.data || error.message;
    console.error("Error adding repository:", errorMessage);

    // Check if the error indicates that the repository is already added
    if (
      error.response?.status === 409 &&
      error.response?.data?.error === "Conflict"
    ) {
      console.log(
        "Repository already added, proceeding to fetch security items..."
      );
      return "already_added";
    }

    return false;
  }
}

// Function to get security items from Codacy
async function getSecurityItems(organization, apiToken) {
  const url = `https://app.codacy.com/api/v3/organizations/gh/${organization}/security/items?api-token=${apiToken}`;

  try {
    const response = await axios.get(url, {
      headers: CODACY_HEADERS(apiToken),
    });
    return response.data;
  } catch (error) {
    console.error(
      "Error fetching security items:",
      error.response?.data || error.message
    );
    throw error;
  }
}

// API endpoint to handle the workflow
app.get("/fetch-security-items/:organization/:repo?", async (req, res) => {
  const { organization, repo } = req.params;
  const apiToken = req.headers["api-token"]; // Extract api-token from the request headers

  if (!apiToken) {
    return res.status(400).json({ error: "API token is required in headers" });
  }

  try {
    if (repo) {
      console.log("Repository name provided, adding repository first...");
      const addResult = await addRepository(
        `${organization}/${repo}`,
        apiToken
      );
      if (addResult === true || addResult === "already_added") {
        console.log(
          "Repository added or already exists, fetching security items..."
        );
        const securityItems = await getSecurityItems(organization, apiToken);
        return res.json(securityItems);
      } else {
        return res.status(500).json({ error: "Failed to add repository" });
      }
    } else {
      console.log(
        "No repository name provided, fetching security items directly..."
      );
      const securityItems = await getSecurityItems(organization, apiToken);
      return res.json(securityItems);
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch security items" });
  }
});

let requestsQueue = [];

// Function to process requests in batches of 5 per second
setInterval(async () => {
  if (requestsQueue.length > 0) {
    const batch = requestsQueue.splice(0, 5);
    batch.forEach(async ({ query, resolve, reject }) => {
      try {
        const response = await axios.get(
          `https://website-contacts-scraper.p.rapidapi.com/scrape-contacts`,
          {
            params: {
              query,
              match_email_domain: false,
              external_matching: false,
            },
            headers: {
              "x-rapidapi-host": "website-contacts-scraper.p.rapidapi.com",
              "x-rapidapi-key": process.env.g2_RAPIDAPI_KEY,
            },
          }
        );
        resolve(response.data);
      } catch (error) {
        reject(error);
      }
    });
  }
}, 1000); // Run every 1000ms (1 second)

// Route to add requests to the queue
app.get("/scrape-contacts", (req, res) => {
  const { query } = req.query;

  if (!query) {
    return res.status(400).json({ error: "Query parameter is required." });
  }

  const requestPromise = new Promise((resolve, reject) => {
    requestsQueue.push({ query, resolve, reject });
  });

  requestPromise
    .then((data) => res.json(data))
    .catch((error) => res.status(500).json({ error: error.message }));
});

// Step 1: Redirect user to LinkedIn authorization page
const CLIENT_SECRET = process.env.LINK_CLIENT_SECRET;
const REDIRECT_URI = process.env.LINK_REDIRECT_URI;
const CLIENT_ID = process.env.LINK_CLIENT_ID;
// const IMAGE_PATH = "./Screenshot_20240723-072711.png"; // Update this with your actual image path

// Step 1: Redirect user to LinkedIn authorization page
app.get("/postToLinkedIn", (req, res) => {
  // const { client_id, client_secret, redirect_uri } = req.query;

  // if (!client_id || !client_secret || !redirect_uri) {
  //   return res.status(400).send("Missing required query parameters");
  // }

  // const state = `${client_id}|${client_secret}|${encodeURIComponent(
  //   redirect_uri
  // )}`;
  const authorizationUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&scope=profile%20openid%20email%20w_member_social`;

  console.log("Redirecting to authorization URL:", authorizationUrl);
  res.send(`Go to the following URL to authorize: ${authorizationUrl}`);
  //  res.redirect(authorizationUrl);
});

// Step 2: Handle callback and exchange code for access token
app.get("/callback", async (req, res) => {
  const authorizationCode = req.query.code;
  // const state = req.query.state;

  if (!authorizationCode) {
    return res.status(400).send("Authorization code not found");
  }

  // Extract client_id, client_secret, and redirect_uri from state
  // const [clientId, clientSecret, redirectUri] = state.split("|");

  try {
    // Exchange authorization code for access token
    const tokenResponse = await axios.post(
      "https://www.linkedin.com/oauth/v2/accessToken",
      null,
      {
        params: {
          grant_type: "authorization_code",
          code: authorizationCode,
          redirect_uri: decodeURIComponent(REDIRECT_URI),
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
        },
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const accessToken = tokenResponse.data.access_token;
    console.log("Access token:", accessToken);

    // Send the access token to the client
    res.json({ accessToken });
  } catch (error) {
    console.error(
      "Error:",
      error.response ? error.response.data : error.message
    );
    res.status(500).send("Failed to obtain access token");
  }
});

// Step 3a: Post to LinkedIn without media
app.post("/postWithoutMedia", async (req, res) => {
  const { accessToken, text } = req.body;

  if (!accessToken || !text) {
    return res.status(400).send("Access token and text are required");
  }

  try {
    // Get the user's profile information to extract the author URN
    const profileResponse = await axios.get(
      "https://api.linkedin.com/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const personURN = profileResponse.data.sub;

    // Post content without media
    const postResponse = await axios.post(
      "https://api.linkedin.com/v2/ugcPosts",
      {
        author: `urn:li:person:${personURN}`,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: {
              text: text,
            },
            shareMediaCategory: "NONE",
          },
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Send success response
    res.json({
      message: "Post published successfully without media!",
      postResponse: postResponse.data,
    });
  } catch (error) {
    console.error(
      "Error:",
      error.response ? error.response.data : error.message
    );
    res.status(500).send("Failed to post to LinkedIn");
  }
});

app.post("/postWithMedia", async (req, res) => {
  const { accessToken, text, imageUrl } = req.body;

  if (!accessToken || !text || !imageUrl) {
    return res
      .status(400)
      .send("Access token, text, and image URL are required");
  }

  // Use timestamp for unique filename
  const timestamp = Date.now();
  const tempImagePath = path.join(
    __dirname,
    "uploads",
    `temp_${timestamp}.jpg`
  );

  // Ensure uploads directory exists
  if (!fs.existsSync(path.join(__dirname, "uploads"))) {
    fs.mkdirSync(path.join(__dirname, "uploads"), { recursive: true });
  }

  try {
    // Download image using axios with buffer
    const imageResponse = await axios({
      method: "get",
      url: imageUrl,
      responseType: "arraybuffer",
      headers: {
        Accept: "image/*",
      },
    });

    // Check if the response contains an image
    const contentType = imageResponse.headers["content-type"];
    if (!contentType || !contentType.startsWith("image/")) {
      throw new Error("Downloaded content is not an image");
    }

    // Write buffer to file
    fs.writeFileSync(tempImagePath, imageResponse.data);
    console.log("Image downloaded successfully to:", tempImagePath);

    // Get user profile
    const profileResponse = await axios.get(
      "https://api.linkedin.com/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const personURN = profileResponse.data.sub;

    // Register upload
    const registerUpload = await axios.post(
      "https://api.linkedin.com/v2/assets?action=registerUpload",
      {
        registerUploadRequest: {
          owner: `urn:li:person:${personURN}`,
          recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
          serviceRelationships: [
            {
              identifier: "urn:li:userGeneratedContent",
              relationshipType: "OWNER",
            },
          ],
          supportedUploadMechanism: ["SYNCHRONOUS_UPLOAD"],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const uploadUrl =
      registerUpload.data.value.uploadMechanism[
        "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
      ].uploadUrl;
    const asset = registerUpload.data.value.asset;

    // Read file and upload to LinkedIn
    const imageBuffer = fs.readFileSync(tempImagePath);

    await axios.put(uploadUrl, imageBuffer, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "image/jpeg",
        "Content-Length": imageBuffer.length,
      },
    });

    // Create post with the uploaded image
    const postResponse = await axios.post(
      "https://api.linkedin.com/v2/ugcPosts",
      {
        author: `urn:li:person:${personURN}`,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: {
              text: text,
            },
            shareMediaCategory: "IMAGE",
            media: [
              {
                status: "READY",
                description: {
                  text: "Image upload via API",
                },
                media: asset,
                title: {
                  text: "Uploaded Image",
                },
              },
            ],
          },
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.json({
      message: "Post published successfully!",
      postId: postResponse.data.id,
    });
  } catch (error) {
    console.error("Error details:", error.response?.data || error.message);
    res.status(500).json({
      error: "Failed to post to LinkedIn",
      details: error.response?.data || error.message,
    });
  } finally {
    // Cleanup: Delete temporary file
    try {
      if (fs.existsSync(tempImagePath)) {
        fs.unlinkSync(tempImagePath);
        console.log("Temporary file deleted:", tempImagePath);
      }
    } catch (cleanupError) {
      console.error("Error deleting temporary file:", cleanupError);
    }
  }
});

app.get("/health-check", (_, res) => res.json("Working on 4th Commit"));

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
