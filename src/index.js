const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const Filter = require('bad-words');
const { generateMessage, generateLocation } = require('./utils/messages');
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users');

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const pubDirPath = path.join(__dirname, '../public')
const port = process.env.PORT || 3000
app.use(express.static(pubDirPath))


io.on('connection', (socket) => {

    socket.on('join', ({ username, room }, callback) => {
        const { error, user } = addUser({
            id: socket.id,
            username,
            room
        })

        if (error)
            return callback(error)

        socket.join(user.room)

        socket.emit('message', generateMessage('Admin', `Welcome ${user.username}`))
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()
    })

    socket.on('sendMessage', (msg, callback) => {
        const filter = new Filter()

        if (filter.isProfane(msg))
            return callback('Profanity is not allowed!')

        const user = getUser(socket.id)

        io.to(user.room).emit('message', generateMessage(user.username, msg))
        callback('Delivered!')
    })

    //Join a user leave send message
    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left!`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })

    socket.on('sendLocation', ({ latitude, longitude } = {}, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('sendLocation', generateLocation(user.username, `https://google.com/maps?q=${latitude},${longitude}`))
        callback('Location shared.')
    })


})

server.listen(port, () => {
    console.log(`Server is up on port ${port}`);
})