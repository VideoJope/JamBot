const {
    Client,
    Attachment
} = require('discord.js');

const ytdl = require("ytdl-core");

const client = new Client();

const token = 'NzIzOTU5NTYxMTEwOTQ1OTAy.Xu5RnQ.UBKIBPzvULftv-AfX84ldEn7ips';

const commandsChannelID = '727016656718659604'; //ID do canal de comandos

const PREFIX = '!';

var servers = {}; //guarda os diferentes servers, cada um com suas filas de músicas

client.on('ready', () => {
    console.log('Bot is online!');
});

client.on('message', async message => {
    
    let args = message.content.substring(PREFIX.length).split(" ");

    if(!servers[message.guild.id]){
        servers[message.guild.id] = {queue: []};
    }

    if(message.channel.id != commandsChannelID) return;


    switch(args[0]){
        case 'help':
            message.reply('não.');
            break;

        case 'coinflip':
            if(Math.random() > 0.4) message.channel.send('Cara.')
            else message.channel.send('Coroa.');
            break;

        case '8ball':
            const roll = Math.floor(Math.random() * 6);
            if(roll <= 1) message.channel.send('Sim.');
            else if(roll <= 3) message.channel.send('Não.');
            else if(roll == 4) message.channel.send('Não sei.');
            else if(roll == 5) message.channel.send('???');
            break;
        
        case 'play':

            async function playMusic(connection, message){

                var server = servers[message.guild.id];

                console.log('Trying to find song name...');
                try{
                    const songName = (await ytdl.getInfo(server.queue[0])).title;

                    console.log(`Song name found! ${songName}`);

                    server.dispatcher = connection.play(ytdl(server.queue[0], {filter: "audioonly"}));

                    message.channel.send(`Tocando agora: ${songName}`);

                    server.playingMusic = true;

                }catch(err){
                    server.queue.shift();
                    message.channel.send('Vídeo indisponível.');
                    if(server.queue[0]) return playMusic(connection, message);
                    else{
                        console.log('Disconnected.');
                        server.playingMusic = false;
                        message.channel.send('Fila encerrada, desconectando...');
                        return connection.disconnect();
                    }
                }



                server.dispatcher.on("finish", function(){
                    console.log('Current stream ended.');
                    server.queue.shift();
                    if(server.queue[0]){
                        console.log('Playing next song.');
                        playMusic(connection, message);
                    }else {
                        console.log('Disconnected.');
                        server.playingMusic = false;
                        message.channel.send('Fila encerrada, desconectando...');
                        connection.disconnect();
                    }
                });
            }


            if(!args[1]) return message.channel.send('Mensagem deve estar no formato: `!play youtubelink`') //TODO: dá pra fazer isso melhor
            if(!validateYouTubeUrl(args[1])) return message.channel.send('Mensagem deve estar no formato: `!play youtubelink`')
            if(!message.member.voice.channel) return message.channel.send('Você deve estar em um canal de voz para ouvir música.')


            var server = servers[message.guild.id];

            try{
                if(!message.guild.voice || !message.guild.voice.channelID){
                    server.queue.push(args[1]);
                    message.member.voice.channel.join().then(function(connection){
                        playMusic(connection, message);
                    });
                }
                else if(message.guild.voice.channelID == message.member.voice.channelID){
                    message.channel.send('Adicionado à fila.');
                    server.queue.push(args[1]);
                }
                else {
                    return message.channel.send('O bot já está tocando música em outro canal de voz.');
                }
            } catch(err){
                return console.log(err);
            }

            console.log(server.queue);

            break;

        case 'skip':
            var server = servers[message.guild.id];
            if(server.dispatcher){
                server.dispatcher.end();
                if(server.playingMusic) message.channel.send('Pulando...');
            }
            break;
        
        case 'stop':
            var server = servers[message.guild.id];

            if(message.guild.voice.connection){

                emptyQueue(server.queue);

                console.log('Queue emptied.');
                console.log(server.queue);
                server.dispatcher.end();
            }

            if(message.guild.connection){
                message.guild.voice.connection.disconnect();
            }
            break;
    
        case 'song':
            var server = servers[message.guild.id];
            if(server.playingMusic){
                try{
                    const songName = (await ytdl.getInfo(server.queue[0])).title;
                    message.channel.send(`Tocando agora: ${songName}`);
                }
                catch(err){
                    return console.log(err);
                }
            }
            
            break;
    
        case 'queue':
        case 'fila': //TODO: Se tiver um vídeo inválido na fila, esse comando não vai retornar nada.
            var server = servers[message.guild.id];
            var queueMessage = '';
            
            for( var i = server.queue.length - 1; i >= 0; i--){
                try{
                    var songName = (await ytdl.getInfo(server.queue[i])).title;
                }
                catch(err){
                    return console.log(err);
                }
                queueMessage = songName + '\n' + queueMessage;
            }

            message.channel.send(':arrow_forward: ' + queueMessage);
            
            break;
    }

});

function validateYouTubeUrl(url)
{
        if (url != undefined || url != '') {
            var regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|\?v=)([^#\&\?]*).*/;
            var match = url.match(regExp);
            if (match && match[2].length == 11) {
                return true;
            }
            else {
                return false;
            }
        }
        return false;
}

function emptyQueue(queueToEmpty){
    for( var i = queueToEmpty.length - 1; i >= 0; i--){
        queueToEmpty.splice(i, 1);
    }
}

client.login(token);