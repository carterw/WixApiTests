# WixApiTests
If you are like me you want to be able to extract data from your Wix site in order to generate reports or maybe even export the data to your own database for safekeeping. There's nothing like some working code examples to get you kickstarted and I hope this will be helpful.

This code exercises several methods in the Wix JavaScript API, and it uses API Key authentication for all operations. The example here extracts services, members, orders, and subscriptions. The data is written out to CSV files in the `csv_exports` directory, which makes it convenient to import into Excel or other tools. This is a starting point and you can modify the code to extract other data.


## Prerequisites

- Node.js 18 or higher
- Wix API Key
- Wix Site ID
  
You can generate and get the API key from the Wix Developer Center. Make sure you have given it all the permissions it needs.
<https://dev.wix.com/docs/rest/articles/getting-started/api-keys>

The Site ID is the ID of your Wix site and you can find it as part of the URL of your Wix dashboard.
(<https://manage.wix.com/dashboard/<your-site-id>/home>)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy the `.env.template` file to a `.env` file in the root directory with the following content:
```
WIX_API_KEY=your_actual_api_key
WIX_SITE_ID=your_site_id
```

## Usage

Run the script:
```bash
node testClient.js
```

