const { createRobot } = require('probot')
const plugin = require('..')
const event = require('./fixtures/event')

describe('reviewed', () => {
  let robot
  let github

  beforeEach(() => {
    robot = createRobot()
    plugin(robot)

    github = {
      repos: {
        getContent: jest.fn().mockReturnValue(Promise.resolve({
          data: {
            content: Buffer.from(`reviewed`).toString('base64')
          }
        }))
      },
      issues: {
        addLabels: jest.fn().mockReturnValue(Promise.resolve())
      },
      pullRequests: {
        getReviews: jest.fn().mockReturnValue(Promise.resolve({
          data: [
            {
              user: {
                login: 'test-reviewer'
              },
              state: 'APPROVED'
            }
          ]
        })),
        getReviewRequests: jest.fn().mockReturnValue(Promise.resolve({
          data: {
            users: []
          }
        })),
        get: jest.fn().mockReturnValue(Promise.resolve({
          data: {
            user: {
              login: 'test-author'
            }
          }
        }))
      }
    }

    robot.auth = () => Promise.resolve(github)
  })

  test('that required API calls are made', async () => {
    await robot.receive(event)

    expect(github.pullRequests.getReviews).toHaveBeenCalled()
    expect(github.pullRequests.getReviewRequests).toHaveBeenCalled()
    expect(github.pullRequests.get).toHaveBeenCalled()
  })

  test('that proper labels have been applied to an pull request', async () => {
    await robot.receive(event)

    expect(github.issues.addLabels).toHaveBeenCalled()
  })
})
