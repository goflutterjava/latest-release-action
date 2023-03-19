"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const fs = __importStar(require("fs"));
function run() {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const token = core.getInput('token');
            const owner = (_a = github.context.payload.repository) === null || _a === void 0 ? void 0 : _a.owner.login;
            const repo = (_b = github.context.payload.repository) === null || _b === void 0 ? void 0 : _b.name;
            const tagName = core.getInput('tag_name');
            const releaseName = core.getInput('release_name');
            const files = core.getInput('files').split(',');
            // Create a GitHub client object
            const client = new github.GitHub(token);
            // Check if the tag exists
            let tagExists = true;
            try {
                yield client.git.getRef({
                    owner: owner,
                    repo: repo,
                    ref: `tags/${tagName}`
                });
            }
            catch (error) {
                if (error.status === 404) {
                    tagExists = false;
                }
                else {
                    throw error;
                }
            }
            if (tagExists) {
                // Check if the release exists
                let releaseExists = true;
                try {
                    yield client.repos.getReleaseByTag({
                        owner: owner,
                        repo: repo,
                        tag: tagName
                    });
                }
                catch (error) {
                    if (error.status === 404) {
                        releaseExists = false;
                    }
                    else {
                        throw error;
                    }
                }
                // Delete the release if it exists
                if (releaseExists) {
                    yield client.repos.deleteRelease({
                        owner: owner,
                        repo: repo,
                        tag_name: tagName
                    });
                }
                // Delete the tag
                yield client.git.deleteRef({
                    owner: owner,
                    repo: repo,
                    ref: `tags/${tagName}`
                });
            }
            // Create a new tag pointing to the latest commit
            const sha = github.context.sha;
            yield client.git.createRef({
                owner: owner,
                repo: repo,
                ref: `refs/tags/${tagName}`,
                sha: sha
            });
            // Create a new release for the tag
            const release = yield client.repos.createRelease({
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
                yield client.repos.uploadReleaseAsset({
                    url: release.data.upload_url,
                    headers: {
                        'content-type': 'application/octet-stream',
                        'content-length': content.length
                    },
                    name: file,
                    data: content
                });
            }
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
run();
