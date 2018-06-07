
const getConfig = require('probot-config')

const defaultConfig = {
  labelName: 'reviewed'
}

module.exports = app => {
  app.on('pull_request_review.submitted', async context => {
    const params = context.issue()

    const reviews = await context.github.pullRequests.getReviews(params)
    const requested_reviewers = await context.github.pullRequests.getReviewRequests(params)
    const pull_request = await context.github.pullRequests.get(params)

    const author = getPullRequestAuthor(pull_request)
    const reviewers = getReviewers(reviews, requested_reviewers, author)
    const approved_reviewers = getApprovedReviewers(reviews)

    const isReviewed = approved_reviewers.length > 0 && reviewers.length === approved_reviewers.length
    if (isReviewed) {
      const config = await getConfig(context, 'reviewed.yml') || defaultConfig
      const labels = context.issue({ labels: [config.labelName] })

      context.github.issues.addLabels(labels)
    }
  })
}

function getApprovedReviewers(reviews) {
  approved_reviewers = reviews.data.filter(review => review.state === 'APPROVED').map(review => review.user.login)

  return [...new Set(approved_reviewers)]
}

function getPullRequestAuthor(pullRequest) {
  return pullRequest.data.user.login
}

function getReviewers(reviews, requestedReviewers, author) {
  reviewers = reviews.data.filter(review => review.user.login !== author).map(review => review.user.login)
  reviewers.push.apply(requestedReviewers.data.users.map(user => user.login))
  return [...new Set(reviewers)]
}
