/**
 * Strip sensitive fields (password hash) before a user is sent to a client.
 */
function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    createdAt: user.createdAt,
  };
}

module.exports = publicUser;
