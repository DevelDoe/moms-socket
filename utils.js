/**
 * Logs messages if verbose mode is enabled.
 *
 * @param {string} message - The message to be logged.
 */
let verboseLog

if (process.argv.includes('-v')) {
    verboseLog = (message) => {
        console.log(`[VERBOSE] ${message}`)
    }
} else {
    // Define a no-op function to avoid errors if verbose mode is not enabled
    verboseLog = () => {}
}

const handleError = (err) => err && console.log(err)

module.exports = {
    verboseLog,
    handleError
}
