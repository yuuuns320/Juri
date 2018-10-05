//  2018-10-06 제작 시작
//  닥터마시리트님 코드 참조(https://cdn.rawgit.com/Dr-Mashirito/sming/master/naverAutoSearch.js)
// 사용예) @JS(https://github.com/yuuuns320/Juri/blob/master/autoMediaCapture.js){ "스트리밍주소": [ [https://tv.naver.com/v/4199001/list/67096] ] }
async function main(arg) {

	var 검색어세트들 = arg.스트리밍주소;	// 검색어세트가 여러개 담긴 배열

	// jquery 로드
	await sming.loadScript('https://code.jquery.com/jquery-latest.min.js');

	// 컨테이너 div 등록
	var $container = $('<div />').css({
		width: '840px',
		overflowX: 'hidden',
		display: 'inline-block'
	});
	$('body').css({ margin: 0, padding: 0 }).append($container);

	// 검색어세트들 순회
	for (var i = 0; i < 검색어세트들.length; i++) {

		var 검색어세트 = 검색어세트들[i];	// 연관 검색어 세트. 예) ['홍길동', '홍길동 아빠']

		// 검색을 수행하고 스크린샷 파일명 2개를 받아온다
		var 임시스샷2개 = await do검색(검색어세트);

		// 임시스샷으로 div 만들기
		var $div = $('<div style="width:840px; position: relative;">'
			+ '<img src="' + 임시스샷2개[0] + '" width="280" height="500" />'
			+ '<img src="' + 임시스샷2개[1] + '" width="280" height="500" />'
			+ '</div>'
		);

		// 낙관이 있다면 div에 불러오기
		var stampFile = await sming.getStampImageFileName();
		if (stampFile) {
			var $stamp = $('<div />').css({
				position: 'absolute',
				top: 0,
				left: 0,
				width: '100%',
				height: '100%',
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center',
				opacity: 0.5,
				zIndex: 9
			});
			$stamp.append('<img src="' + stampFile + '" />')
			$stamp.appendTo($div);
		}

		// 이 div를 화면에 표시
		$container.append($div);
	}

	// 통합화면 스샷을 저장
	var finalImageFile = await sming.saveElement($container[0]);

	// 통합화면 스샷 파일명 리턴
	return finalImageFile;
}


// 네이버 검색 수행 함수
async function do검색(검색어세트) {
	var 임시스샷2개 = [];

	// 네이버창 열기
	var 스트리밍창 = window.open(검색어세트, "winNaver", "width=360,height=640,resizable");
	await sming.waitEvent(video, 'load');
	await sming.wait(500);

	var mediaInfo = MediaHeartbeat.createMediaObject(Configuration.VIDEO_NAME,
							 Configuration.VIDEO_ID,
							 Configuration.VIDEO_LENGTH,
							 MediaHeartbeat.StreamType.VOD);
	var videoMetadata = {CUSTOM_KEY_1 : CUSTOM_VAL_1, 
			     CUSTOM_KEY_2 : CUSTOM_VAL_2,
			     CUSTOM_KEY_3 : CUSTOM_VAL_3
			    };
	
	// 1. Call trackSessionStart() when Play is clicked or if autoplay is used,
	//    i.e., there's an intent to start playback.
	this._mediaHeartbeat.trackSessionStart(mediaInfo, videoMetadata);
	
	// Preroll
	var adBreakInfo = MediaHeartbeat.createAdBreakObject(ADBREAK_NAME,
							     ADBREAK_POSITION,
							     ADBREAK_START_TIME);
	
	MediaObject adInfo = MediaHeartbeat.createAdObject(AD_NAME,
							   AD_ID,
							   AD_POSITION,
							   AD_LENGTH);
	
	//context ad data
	var adMetadata = {CUSTOM_KEY_1 : CUSTOM_VAL_1, CUSTOM_KEY_2 : CUSTOM_VAL_2};
	
	// 2. Track the MediaHeartbeat.Event.AdBreakStart event when the preroll pod starts to play. 
	//    Since this is a preroll, you must track the MediaHeartbeat.Event.AdBreakStart event 
	//    before calling trackPlay().
	this._mediaHeartbeat.trackEvent(MediaHeartbeat.Event.AdBreakStart, adBreakInfo);
	
	// 3. Track the MediaHeartbeat.Event.AdStart event when the preroll pod's ad starts to play. 
	//    Since this is a preroll, you must track the MediaHeartbeat.Event.AdStart event before 
	//    calling trackPlay().
	this._mediaHeartbeat.trackEvent(MediaHeartbeat.Event.AdStart, adInfo, adMetadata);
	
	// 4. Call trackPlay() when the playback actually starts, i.e., when the first frame of 
	//    the main content is rendered on the screen.
	this._mediaHeartbeat.trackPlay();
	
	// 5. Track the MediaHeartbeat.Event.AdSkip event when the user intends to (and can)  
	//    skip the ad. For example, this could be tied to a "skip ad" button onClick handler. 
	//    The application could have the viewer land in the main content post ad.
	this._mediaHeartbeat.trackEvent(MediaHeartbeat.Event.AdSkip);
	
	var video1 = document.getElementById("video1");
	Math.floor(video1.currentTime) + "/" + Math.floor(video1.duration)
	
	// 스크린샷
	if (Math.floor(video1.currentTime) == 5) {
		var 스샷파일명 = await sming.saveScreenshot("winNaver");		// 임시스샷 저장 1
		임시스샷2개.push(스샷파일명);
	} else if ((Math.floor(video1.duration) - Math.floor(video1.currentTime)) == 5) {
		var 스샷파일명 = await sming.saveScreenshot("winNaver");		// 임시스샷 저장 2
		임시스샷2개.push(스샷파일명);
	}
	
	// 네이버창 닫기
	스트리밍창.close();
	return 임시스샷2개;
}
