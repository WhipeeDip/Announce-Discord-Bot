/*
* File name: announce_bot.js
* Description: Does announce stuff.
*/

const fs = require('fs');
const path = require('path');

// require() this and pass in the discord.js logged in client
module.exports = function(discordClient) {
    const CMD_ANNOUNCE = '!announce ';
    const MSG_INVALID_FORMAT = 'Format is !announce [#channel] [message]';
    const MSG_CHANNEL_NOT_FOUND = 'Channel was not found!';
    const MSG_TOO_LONG = 'Message was too long.';
    const CONSOLE_CAN_ANNOUNCE_NOT_SET='ROLE_CAN_ANNOUNCE not set, exiting.';
    const CONSOLE_IMG_NOT_SET = 'IMG_ANNOUNCE not set.';
    const CONSOLE_IMG_ERR = 'Error while opening IMG_ANNOUNCE. Check that it exists and you have permissions to read the file.';
    const CONSOLE_ROLE_NOT_SET = 'ROLE_ANNOUNCE not set.';
    const CONSOLE_ROLE_ERR = 'Error while finding ROLE_ANNOUNCE. Check that the role exists.';
    const DISCORD_MSG_LIMIT = 1500;

    const imgAnnounce = process.env.IMG_ANNOUNCE;
    const roleAnnounce = process.env.ROLE_ANNOUNCE;
    const canAnnounce = process.env.ROLE_CAN_ANNOUNCE;

    const sendAnnouncement = async function(channel, channelId, message, member) {
        if (member.roles.find(role => role.name === canAnnounce) == undefined) {
            return;
        }

        if (message.length > DISCORD_MSG_LIMIT) {
            channel.send(MSG_TOO_LONG).error(console.error);
            return;
        }

        let guild = channel.guild;
        let foundChannel = guild.channels.get(channelId);
        if (foundChannel === undefined) {
            channel.send(MSG_CHANNEL_NOT_FOUND).catch(console.error);
            return;
        }

        let imgErr = false;
        if (imgAnnounce !== undefined) {
            // check if image exists and readable
            if (!fs.existsSync(imgAnnounce)) {
                console.error(CONSOLE_IMG_ERR);
                imgErr = true;
            }

            try {
                fs.accessSync(imgAnnounce, fs.constants.R_OK);
            } catch (err) {
                console.error(CONSOLE_IMG_ERR);
                imgErr = true;
            }
        } else {
            imgErr = true;
        }

        if (!imgErr) {
            let fileName = path.basename(imgAnnounce);
            try {
                await foundChannel.send({
                    'files': [{
                        'attachment': imgAnnounce,
                        'name': fileName
                    }]
                });
            } catch (err) {
                console.error(err);
                return;
            }
        }

        let fullMsg = '**Announcement:** \n' + message;

        if (roleAnnounce !== undefined) {
            let foundRole = guild.roles.find(role => role.name === roleAnnounce);
            if (foundRole == undefined) {
                console.error(CONSOLE_ROLE_ERR);
            } else {
                fullMsg = foundRole + '\n' + fullMsg;
            }
        }

        foundChannel.send(fullMsg).catch(console.error);
    };

    discordClient.on('message', async (msg) => {
        // ignore self
        if (msg.author.id === discordClient.user.id) {
            return;
        }

        let msgContent = msg.content;
        let channel = msg.channel;

        if (msgContent.startsWith(CMD_ANNOUNCE)) {
            let channelAndMsg = msgContent.substring(CMD_ANNOUNCE.length);
            let spaceIndex = channelAndMsg.indexOf(' ');
            if (spaceIndex === -1 || spaceIndex === (channelAndMsg.length - 1)) {
                channel.send(MSG_INVALID_FORMAT);
                return;
            }

            let channelMention = channelAndMsg.substring(0, spaceIndex);
            if (channelMention.length <= 4) {
                channel.send(MSG_INVALID_FORMAT);
                return;
            }

            let channelId = channelMention.substring(2, channelMention.length - 1);
            let message = channelAndMsg.substring(spaceIndex + 1);
            sendAnnouncement(channel, channelId, message, msg.member);
        }
    });

    // init
    (() => {
        if (imgAnnounce === undefined) {
            console.error(CONSOLE_IMG_NOT_SET);
        }

        if (roleAnnounce === undefined) {
            console.error(CONSOLE_ROLE_NOT_SET);
        }

        if (canAnnounce === undefined) {
            console.error(CONSOLE_CAN_ANNOUNCE_NOT_SET);
            process.exit(1);
        }
    })();
};
