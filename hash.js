const bcrypt = require('bcryptjs');

const users = [
    { username: 'user1', password: 'password1' },
    { username: 'user2', password: 'password2' }
];

users.forEach(user => {
    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(user.password, salt, (err, hash) => {
            if (err) throw err;
            console.log(`Username: ${user.username}, Password: ${hash}`);
        });
    });
});
