#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')
const tslint = require('tslint')

const fetchDocs = require('./vendor/fetch-docs')
const generateTypings = require('./')

let outFile
let inFile
process.argv.forEach((arg) => {
  if (arg.startsWith('-o=')) {
    outFile = arg.substring(3)
  } else if (arg.startsWith('--out=')) {
    outFile = arg.substring(6)
  }
  if (arg.startsWith('-i=')) {
    inFile = arg.substring(3)
  } else if (arg.startsWith('--in=')) {
    inFile = arg.substring(5)
  }
})

let apiPromise
if (inFile) {
  const inPath = path.resolve(process.cwd(), inFile)
  if (fs.existsSync(inPath)) {
    apiPromise = Promise.resolve(require(path.resolve(process.cwd(), inFile)))
  } else {
    apiPromise = fetchDocs(inFile)
  }
} else {
  apiPromise = fetchDocs()
}

apiPromise.then(API => {
  return JSON.parse(JSON.stringify(API))
}).then(API => {
  const output = generateTypings(API).join('\n') + '\n'
  const linter = new tslint.Linter({})
  const configuration = tslint.Configuration.findConfiguration(
    path.join(__dirname, 'tslint.json'), outFile
  ).results
  linter.lint(outFile, output, configuration)
  const result = linter.getResult()

  if (result.failureCount === 0) {
    fs.writeFileSync(outFile, output)
  } else {
    console.error('Failed to lint electron.d.ts')
    result.failures.forEach(failure => {
      delete failure.rawLines
      delete failure.sourceFile
      console.log('\n\n----------\n\n')
      console.log(failure)
    })

    process.exit(1)
  }
})
