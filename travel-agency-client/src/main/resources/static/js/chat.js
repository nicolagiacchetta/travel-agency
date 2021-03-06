$(function(){
	var host = $.trim($('#conversationUrl').text());
	var chat = $('#chat-wrapp');
	
	
	function initChat(){
		if ( conversationSession.exists() ){;
			loadLastMessages(host);	
			openChat(host);
		}else{
		
			$.postJSON(host + '/conversations', {})
				.done(function(conversation){
					conversationSession.init( conversation );
					openChat(host);
				});
		}
	}
	
	
	
	function loadLastMessages(host){
		var conversationId = conversationSession.getConversationId();
		console.log('Loading messages: ' + conversationId);
		$('ul.chat').html('<li style="margin: 100px;border: none"><img alt="" src="/static/img/loader.gif"><span style="padding:5px;">Loading...</span></li>');
		$.getJSON(host + '/conversations/' + conversationId + "/messages" )
			.done(function(messages){
				if(messages){
					var html = '';
					for(var i = 0; i < messages.length; i++){
						html += renderMessage( messages[i] );
					}
					$('ul.chat').html('');
					appendMessage(html);
				}
			});
	}
	
	function refreshVisibilityChat(){
		var state = conversationSession.isChatHidden() ? 'hide' : 'show',
			btn = $('#chat-wrapp .toggle-btn');
		$('#collapseOne').collapse(state);
		if(!conversationSession.isChatHidden()){
			btn.removeClass('glyphicon-chevron-up')
				.addClass('glyphicon-chevron-down');
		}else{
			btn.removeClass('glyphicon-chevron-down')
				.addClass('glyphicon-chevron-up');
		}
	}
	
	$('#collapseOne').on('hidden.bs.collapse', function () {
		conversationSession.markChatHidden();
		refreshVisibilityChat();
		console.log('hidden.bs.collapse');
	});
	$('#collapseOne').on('shown.bs.collapse', function () {
		if(!chat.data('init')){
			initChat();
			chat.data('init', true);
		}
		conversationSession.markChatVisible();
		refreshVisibilityChat();
		console.log('shown.bs.collapse');
	});
	
	initTimeRefresher();
	refreshVisibilityChat();
});

function appendMessage(message){
	var ul = $('#chat-wrapp').find('ul.chat');
	ul.append(message);
	ul.parent().scrollTop(ul[0].scrollHeight);
}

function openChat(host){
	connect(host);
	$('#chat-wrapp').show();
}

function connect(host){
	var socket = new SockJS(host + '/ws');
	var stompClient = Stomp.over(socket);
	var conversationId = conversationSession.getConversationId();
	var participantId = conversationSession.getParticipantId();
	var headers = { participantId : participantId };
	
	stompClient.connect( headers, function(frame) {
		console.log('connected', frame);

		
		stompClient.subscribe("/topic/chat/"+conversationId, function(message) {
			var body = $.parseJSON(message.body);
			appendMessage(renderMessage(body));
		}, headers);
		
	} );
	
	$(document).on('click', '#btn-chat',submitMessage)
	$(document).on('keypress', function(e){
		if(e.which == 13) submitMessage();
	});
	
	function submitMessage(){
		var $input = $('#btn-input'),
			conversationId = conversationSession.getConversationId(),
			participantId = conversationSession.getParticipantId(),
			messageContent = $.trim($input.val());
		
		if(messageContent){
			var message = {
				content : messageContent,
				conversationId : conversationId,
				participantId : participantId
			};
			stompClient.send("/app/chat/"+ conversationId , {},  JSON.stringify(message));
			$input.val('');
		}
	}
}

/**
 *
    {
        "content": "test", 
        "created": "2018-01-02T21:22:29.035Z", 
        "id": "5a4bf8152e1328318472a24d", 
        "participant": {
            "id": "2f4d2a38-e4ac-4cec-814f-e1e3e7b7ecf6", 
            "name": "annonymusUser", 
            "type": "USER"
        }, 
        "type": "USER"
    }
 */
var renderMessage = function(message){
	console.log(message);
	if(message.type == 'EVENT'){
		return '<li class="chat-event clearfix">'+message.content+'</li>';
	}
	
	var isAgent = message.participant.type !== 'USER',
		time = message.created,
		name = message.participant.type == 'USER' ? 'You' : message.participant.name;
	
	return '<li class="'+(isAgent ? 'right' : 'left')+' clearfix" data-time="'+time+'">'
				+ avatar(isAgent, name) +
			    '<div class="chat-body clearfix">'+
			        '<div class="header">'+ 
			            '<strong class="primary-font">'+name+'</strong> <small class="pull-right text-muted">'+
			              messageType(message) +
			            '<span class="glyphicon glyphicon-time"></span><span class="datetime">'+time_ago(time)+'</span></small>'+
			        '</div>'+
			        '<p>'+ message.content + '</p>'+
			    '</div>'+
			'</li>';
	
	function avatar(isAgent, name){
		var avatar = { id : '55C1E7', pos : 'left' };
		if(isAgent){
			avatar = { id : 'FA6F57', pos : 'right' };
		}
		return  '<span class="chat-img pull-'+avatar.pos+'">'+
				'<span class="radius"></span><span class="glyphicon glyphicon-user"></span></span>'+
				'</span>';
		
	}
	
	function messageType(message){
		if(message.type === 'SMS'){
			return '<span class="sms"><span class="glyphicon glyphicon-phone"></span>SMS</span>';
		}
		return '';
	}
}

function initTimeRefresher(){
	 setInterval(function(){
		 $('#chat-wrapp .chat li').each(function(){
			var msg = $(this);
			msg.find('.datetime').text(time_ago(msg.attr('data-time')));
		 });
	 }, 5000);
}

var conversationSession = (function(){
	var cid_key = '__cid',
		pid_key = '__pid',
		chat_key = '__chat';
	
	var exists = function(){
		return sessionStorage.getItem(cid_key) !== null;
	},
	init = function(conversation){
		sessionStorage.setItem(cid_key, conversation.id);
		sessionStorage.setItem(pid_key, conversation.participants[0].id);
	},
	getConversationId = function(){
		return sessionStorage.getItem(cid_key);
	},
	getParticipantId = function(){
		return sessionStorage.getItem(pid_key);
	},
	markChatHidden = function(){
		return sessionStorage.removeItem(chat_key);
	},
	markChatVisible = function(){
		return sessionStorage.setItem(chat_key, '1');
	},
	isChatHidden = function(){
		return sessionStorage.getItem(chat_key) === null;
	},
	destroy = function(){
		sessionStorage.removeItem(cid_key);
		sessionStorage.removeItem(pid_key);
	};
	return {
		exists : exists,
		init : init,
		getConversationId : getConversationId,
		getParticipantId : getParticipantId,
		markChatHidden : markChatHidden,
		markChatVisible : markChatVisible,
		isChatHidden : isChatHidden,
		destroy : destroy
	}
	
}());

function time_ago(time) {

	  switch (typeof time) {
	    case 'number':
	      break;
	    case 'string':
	      time = +new Date(time);
	      break;
	    case 'object':
	      if (time.constructor === Date) time = time.getTime();
	      break;
	    default:
	      time = +new Date();
	  }
	  var time_formats = [
	    [60, 'seconds', 1], // 60
	    [120, '1 minute ago', '1 minute from now'], // 60*2
	    [3600, 'minutes', 60], // 60*60, 60
	    [7200, '1 hour ago', '1 hour from now'], // 60*60*2
	    [86400, 'hours', 3600], // 60*60*24, 60*60
	    [172800, 'Yesterday', 'Tomorrow'], // 60*60*24*2
	    [604800, 'days', 86400], // 60*60*24*7, 60*60*24
	    [1209600, 'Last week', 'Next week'], // 60*60*24*7*4*2
	    [2419200, 'weeks', 604800], // 60*60*24*7*4, 60*60*24*7
	    [4838400, 'Last month', 'Next month'], // 60*60*24*7*4*2
	    [29030400, 'months', 2419200] // 60*60*24*7*4*12, 60*60*24*7*4
	  ];
	  var seconds = (+new Date() - time) / 1000,
	    token = 'ago',
	    list_choice = 1;

	  if (seconds < 5) {
	    return 'Just now'
	  }
	  if (seconds < 0) {
	    seconds = Math.abs(seconds);
	    token = 'from now';
	    list_choice = 2;
	  }
	  var i = 0,
	    format;
	  while (format = time_formats[i++])
	    if (seconds < format[0]) {
	      if (typeof format[2] == 'string')
	        return format[list_choice];
	      else
	        return Math.floor(seconds / format[2]) + ' ' + format[1] + ' ' + token;
	    }
	  return time;
	}
