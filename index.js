import { createRequire } from 'node:module';
import { parseArgs } from 'node:util';
import { Octokit } from "octokit";
import { getPackageManifest } from 'query-registry';
import terminalLink from 'terminal-link';

const require = createRequire(import.meta.url)
const hostedGitInfo = require('hosted-git-info')

// get first argument
const args = parseArgs({
    allowPositionals: true,
})
const pkg = args.positionals.at(0)

if (!pkg) {
    console.error('Please provide a package name')
    process.exit(1)
}

console.log(terminalLink('npm', new URL(pkg, 'https://www.npmjs.com/package/').href))

// get package info
const packument = await getPackageManifest(pkg).catch(err => {
    console.error('cannot get package info', err)
    process.exit(1)
})
const gitInfo = hostedGitInfo.fromUrl(
    typeof packument.repository === 'string'
        ? packument.repository
        : packument.repository?.url
)

if (!gitInfo) {
    console.log('No git repository found')
    process.exit(1)
}

if (packument.homepage) {
    console.log(terminalLink('homepage', packument.homepage))
} else {
    console.log('No homepage found')
}

if (!gitInfo.type === 'github') {
    console.error('Only github repositories are supported')
    process.exit(1)
}

console.log(terminalLink('repository', gitInfo.browse()))

const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
})
const { data: files } = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
    owner: gitInfo.user,
    repo: gitInfo.project,
}).catch(err => {
    console.error('cannot get repository contents', err)
    process.exit(1)
})

const names = [
    'CHANGELOG.md',
    'CHANGELOG',
    'CHANGELOG.txt',
    'CHANGELOG.rst',
    'CHANGES.md',
    'CHANGES',
    'CHANGES.txt',
]

const changelog = files.find(file => names.includes(file.name))
const changelogUrl = changelog?.html_url

if (changelogUrl) {
    console.log(terminalLink('changelog', changelogUrl))
}

const { data: releases } = await octokit.request('GET /repos/{owner}/{repo}/releases', {
    owner: gitInfo.user,
    repo: gitInfo.project,
})
if (releases.length > 0) {
    console.log(terminalLink('releases', `https://github.com/${gitInfo.user}/${gitInfo.project}/releases`))
}
