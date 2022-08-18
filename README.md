  > **Warning**
  > This repository is no longer recommended or maintained and has now been archived. Huge thanks to the original authors and contributors for providing this to our community. Should you wish to maintain your own version of this repository, you are welcome to fork this repository and continue developing it there.
  
  ---

# YouTube to Orbit Workspace

![Build Status](https://github.com/orbit-love/community-js-youtube-orbit/workflows/CI/badge.svg)
[![npm version](https://badge.fury.io/js/%40orbit-love%2Fyoutube.svg)](https://badge.fury.io/js/%40orbit-love%2Fyoutube)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.0-4baaaa.svg)](.github/CODE_OF_CONDUCT.md)

This is a JavaScript package that can be used to integrate YouTube comments from videos uploaded to a specified channel into your organization's Orbit workspace.

![](docs/activity.png)

|<p align="left">:sparkles:</p> This is a *community project*. The Orbit team does its best to maintain it and keep it up to date with any recent API changes.<br/><br/>We welcome community contributions to make sure that it stays current. <p align="right">:sparkles:</p>|
|-----------------------------------------|

![There are three ways to use this integration. Install package - build and run your own applications. Run the CLI - run on-demand directly from your terminal. Schedule an automation with GitHub - get started in minutes - no coding required](docs/ways-to-use.png)

## First Time Setup

To set up this integration you will need some details from YouTube.

1. Create a project in the [Google Developers Console](https://console.developers.google.com/)
2. After creating your project, make sure the YouTube Data API is one of the services that your application is registered to use.
3. Go to the Credentials area of your application and create an API Key. Take note of the API Key as it will only be shown once.
4. Get your Channel's ID by [following these steps](https://support.google.com/youtube/answer/3250431).

## Notes about quota

Please take a moment to read the [quota usage](https://developers.google.com/youtube/v3/getting-started#quota) section of the YouTube Data API documentation. Per request this application:

- makes one list channel request
- makes one list videos request for every 50 videos on your channel
- makes one list commentThread request for every video with at least one comment

This should be fine for a majority of channels, but if you are concerned you will exceed the quota follow the provided guide on how to request a quota increase.

## Package Usage

Install the package with the following command

```
$ npm install @orbit-love/youtube
```

Use the package with the following snippet.

```js
const OrbitYouTube = require('@orbit-love/youtube')
const orbitYouTube = new OrbitYouTube()

const summary = addNewComments({ channelId: 'channel-id', hours: 24 })
console.log(summary) // "{ added: 42, duplicates: 0, errors: [] }"
```

The standard initialization of the library requires the following signature:

```js
const OrbitYouTube = require('@orbit-love/youtube')
const orbitYouTube = new OrbitYouTube('orbitWorkspaceId', 'orbitApiKey', 'ytApiKey')
```

If you have the following environment variables set: `ORBIT_WORKSPACE_ID`, `ORBIT_API_KEY`, and `YOUTUBE_API_KEY` then you can initialize the client as follows:

```js
const OrbitYouTube = require('@orbit-love/youtube')
const orbitYouTube = new OrbitYouTube()
```

### Methods

#### `addNewComments([options])`

Use this if you do not want to use provided methods and want the easiest way to add new YouTube comments to Orbit.

|Property|Purpose|Options|Default|
|---|---|---|---|
|options.channelId|YouTube Channel ID|string||
|options.hours|How many hours worth of comments to add|int||
|options.log|Verbosely log progress|true, false|false|

Returns Promise -> Object { added: int, duplicates: int, errors: [] }

#### `getChannelUploadPlaylistId(channelId)`

All of a channel's uploaded videos are in a hidden playlist. This method returns the ID of that playlist.

Returns: Promise -> String

#### `getVideoPage(playlistId, [pageToken])`

Returns a single page of video results from the provided playlist. Also returns the `nextPageToken` if present.

Returns Promise -> Object { items: [], nextPageToken?: 'token' }

#### `getVideos(playlistId)`

Loops over pages using `getVideoPage()` and returns a complete list of videos from the provided playlist.

Returns Promise -> Array

#### `getCommentPage(videoId, [pageToken])`

Returns a single page of comment results from the provided video. Also returns the `nextPageToken` if present.

Returns Promise -> Object { items: [], nextPageToken?: 'token' }

#### `getComments(videoId)`

Loops over pages using `getCommentPage()` and returns a complete list of comments from the provided video.

Returns Promise -> Array

#### `getChannelComments(channelId, [options])`

Equivalent to calling `getChannelUploadPlaylistId()`, `getVideos()`, and `getComments()` for each video.

|Property|Purpose|Options|Default|
|---|---|---|---|
|options.log|Verbosely log progress|true, false|false|
|options.addTitle|Add video title to returned comment objects|true, false|false|

Return Promise -> Array

#### `filterComments(list, hours)`

Given a list of comments, filters out any comments which are older than the specified hours.

Returns Promise -> Array

#### `prepareComments(list, [hours])`

Given a list of comments, prepares objects as valid Orbit activities ready to be sent via the Orbit API. You may optionally provide hours and this function will run `filterComments()` on your behalf.

Returns Promise -> Array

#### `addActivities(list)`

Sends the provided list of prepared activities to Orbit via the Orbit API. Duplicates will not be added to Orbit.

Returns Promise -> Object { added: int, duplicates: int, errors: [] }

## CLI Usage

To use this package you do not need to install it, but will need Node.js installed on your machine.

```
npx @orbit-love/youtube --comments
```

By default this will get the last 24 hours worth of activity, but this can be explicitly overridden:

```
npx @orbit-love/youtube --comments --hours=24
```

If you have set the `YOUTUBE_CHANNEL_ID` environment variable we will use this. If you want to be explicit you can provide it explicitly:

```
npx @orbit-love/youtube --comments --channel=id
```

To use the CLI you must have the following environment variables set: `ORBIT_WORKSPACE_ID`, `ORBIT_API_KEY`, `YOUTUBE_API_KEY`.

## GitHub Actions Automation Setup

⚡ You can set up this integration in a matter of minutes using our GitHub Actions template. It will run regularly to add new activities to your Orbit workspace. All you need is a GitHub account.

[See our guide for setting up this automation](https://github.com/orbit-love/github-actions-templates/blob/main/YouTube/README.md)

## Performing a Historical Import

You may want to perform a one-time historical import to fetch all your previous YouTube interactions and bring them into your Orbit workspace. To do so, set the hours tag to 720 for 30 days of import.

## Contributing

We 💜 contributions from everyone! Check out the [Contributing Guidelines](.github/CONTRIBUTING.md) for more information.

## License

This project is under the [MIT License](./LICENSE).

## Code of Conduct

This project uses the [Contributor Code of Conduct](.github/CODE_OF_CONDUCT.md). We ask everyone to please adhere by its guidelines.
