import * as core from '@actions/core';
import * as github from '@actions/github';
import * as fs from 'fs';

async function run() {
  try {
    const token = core.getInput('token');
    const owner = github.context.payload.repository?.owner.login;
    const repo = github.context.payload.repository?.name;
    const tagName = core.getInput('tag_name');
    const releaseName = core.getInput('release_name');
    const files = core.getInput('files').split(',');

    // Create a GitHub client object
    const client = new github.GitHub(token);

    // Check if the tag exists
    let tagExists = true;
    try {
      await client.git.getRef({
        owner: owner,
        repo: repo,
        ref: `tags/${tagName}`
      });
    } catch (error) {
      if (error.status === 404) {
        tagExists = false;
      } else {
        throw error;
      }
    }

    if (tagExists) {
      // Check if the release exists
      let releaseExists = true;
      try {
        await client.repos.getReleaseByTag({
          owner: owner,
          repo: repo,
          tag: tagName
        });
      } catch (error) {
        if (error.status === 404) {
          releaseExists = false;
        } else {
          throw error;
        }
      }

      // Delete the release if it exists
      if (releaseExists) {
        await client.repos.deleteRelease({
          owner: owner,
          repo: repo,
          tag_name: tagName
        });
      }

      // Delete the tag
      await client.git.deleteRef({
        owner: owner,
        repo: repo,
        ref: `tags/${tagName}`
      });
    }

    // Create a new tag pointing to the latest commit
    const sha = github.context.sha;
    await client.git.createRef({
      owner: owner,
      repo: repo,
      ref: `refs/tags/${tagName}`,
      sha: sha
    });

    // Create a new release for the tag
    const release = await client.repos.createRelease({
      owner: owner,
      repo: repo,
      tag_name: tagName,
      name: releaseName,
      draft: false,
      prerelease: false
    });

    // Upload files to the release
    for (const file of files) {
      const content = fs.readFileSync(file);
      await client.repos.uploadReleaseAsset({
        url: release.data.upload_url,
        headers: {
          'content-type': 'application/octet-stream',
          'content-length': content.length
        },
        name: file,
        data: content
      });
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
