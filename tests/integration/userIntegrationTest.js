const chai = require('chai');
const chaiHttp = require('chai-http');

const app = require('../../index'); //entry point for your application
const expect = chai.expect;

chai.use(chaiHttp);

describe('User Integration Test', () => {
    it('should create a new user and retrieve the details', (done) => {
        const user = {
            username: 'ian',
            email: 'ian@mail.com',
            password: '123456',
            full_name: 'Ian PLP'
        };

        chai.request(app)
            .post('/register')
            .send(user)
            .end((err, res) => {
                expect(res).to.have.status(201);
                expect(res.body).to.be.an('object');
                expect(res.body).to.have.property('username').eql('ian');
                expect(res.body).to.have.property('email').eql('ian@mail.com');
                expect(res.body).to.have.property('full_name').eql('Ian PLP');
                done();
        });
    });
});