
const getConfig = require('probot-config')

const defaultConfig = {
  labelName: 'reviewed'
}

module.exports = app => {
  app.on('pull_request.synchronize', async context => {
    const params = context.issue()

    const config = await getConfig(context, 'reviewed.yml') || defaultConfig
    const rmLabel = context.issue({ name: config.labelName })

    const issueLabels = await context.github.issues.getIssueLabels(params)
    const labels = issueLabels.data.map(label => label.name)

    if (!labels.includes(config.labelName)) {
      return
    }

    const reviews = await context.github.pullRequests.getReviews(params)
    const requestedReviewers = await context.github.pullRequests.getReviewRequests(params)
    const pullRequest = await context.github.pullRequests.get(params)

    const author = getPullRequestAuthor(pullRequest)
    const reviewers = getReviewers(reviews, requestedReviewers, author)
    const approvedReviewers = getApprovedReviewers(reviews)

    const isReviewed = approvedReviewers.length > 0 && reviewers.length === approvedReviewers.length
    if (!isReviewed) {
      context.github.issues.removeLabel(rmLabel)
    }
  })

  app.on('pull_request_review.submitted', async context => {
    const params = context.issue()

    const reviews = await context.github.pullRequests.getReviews(params)
    const requestedReviewers = await context.github.pullRequests.getReviewRequests(params)
    const pullRequest = await context.github.pullRequests.get(params)

    const author = getPullRequestAuthor(pullRequest)
    const reviewers = getReviewers(reviews, requestedReviewers, author)
    const approvedReviewers = getApprovedReviewers(reviews)

    const isReviewed = approvedReviewers.length > 0 && reviewers.length === approvedReviewers.length
    if (isReviewed) {
      const config = await getConfig(context, 'reviewed.yml') || defaultConfig
      const labels = context.issue({ labels: [config.labelName] })

      context.github.issues.addLabels(labels)
    }
  })
}

function getApprovedReviewers (reviews) {
  const approvedReviewers = reviews.data.filter(review => review.state === 'APPROVED').map(review => review.user.login)

  return [...new Set(approvedReviewers)]
}

function getPullRequestAuthor (pullRequest) {
  return pullRequest.data.user.login
}

function getReviewers (reviews, requestedReviewers, author) {
  let reviewers = reviews.data.filter(review => review.user.login !== author).map(review => review.user.login)
  reviewers.push.apply(requestedReviewers.data.users.map(user => user.login))
  return [...new Set(reviewers)]
}
