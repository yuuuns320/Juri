
// 네이버 연관검색어 자동 수행

// 최초작성: 2018-10-06 by 닥터마시리트
// 수정: 모니터 최소해상도 1460에 맞춤. 카테고리 대기시간 10초로 늘림 (2018-10-10 by 닥터마시리트)
// 사용예 1) @JS(https://rawgit.com/Dr-Mashirito/sming/master/naverAuto.js){ "주검색어": "시타오 미우", "연관검색어": [ ["시타오 미우 농어촌"], ["시타오 미우 선발"] ] }
// 사용예 2) @JS(https://rawgit.com/Dr-Mashirito/sming/master/naverAuto.js){ "주검색어": "시타오 미우", "연관검색어": [ ["시타오 미우 농어촌", "애칭 붙은 이유는", "시골소녀의 재발견"], ["시타오 미우 선발@뉴스", "http://www.getnews.co.kr/news/articleView.html?idxno=92822", "문우상 기자"] ], "대기시간": 12 }

async function main(arg) {

	// 인자 체크
	if (!arg) throw '연검작업용 파라메터가 존재하지 않습니다.';
	if (!arg.주검색어) throw '주검색어가 올바르게 설정되지 않았습니다.';
	if (!arg.연관검색어 || !arg.연관검색어.length) throw '연관검색어가 올바르게 설정되지 않았습니다.';

	var 주검색어 = arg.주검색어;		// "시타오 미우"
	var 대기시간 = arg.대기시간 || 10;	// 10

	// jquery 로드
	await sming.loadScript('https://code.jquery.com/jquery-latest.min.js');

	// 컨테이너 div 등록
	var $container = $('<div id="container" />').css({
		width: '840px',
		overflowX: 'hidden',
		display: 'inline-block'
	});
	$('body').css({ margin: 0, padding: 0 }).append($container);

	// 연관검색어 순서 무작위로 섞기
	shuffle(arg.연관검색어);

	// 연관검색어 배열 순회
	var tasks = [];
	for (var i = 0; i < arg.연관검색어.length; i++) {

		var 연관검색어 = arg.연관검색어[i].shift();	// "시타오 미우 농어촌"
		var 링크후보단어들 = arg.연관검색어[i];		// [ "애칭 붙은 이유는", "시골소녀의 재발견" ]
		var 카테고리 = undefined;

		if (연관검색어.lastIndexOf('@') != -1) {
			카테고리 = 연관검색어.substr(연관검색어.lastIndexOf('@') + 1);
			연관검색어 = 연관검색어.substr(0, 연관검색어.lastIndexOf('@'));
		}

		// 1개의 연관검색세트 작업을 수행
		var ctx = await do연관검색세트(주검색어, 연관검색어, 카테고리, 링크후보단어들, 대기시간);
		tasks.push( do스샷취합(ctx) );
	}

	// 모든 작업이 완료될때까지 대기
	await Promise.all(tasks);

	// 통합화면 스샷을 저장
	var finalImageFile = await sming.saveElement($container[0]);

	// 통합화면 스샷 파일명 리턴
	return finalImageFile;
}

var winCnt = 0;

// 연관검색세트 수행 함수
async function do연관검색세트(주검색어, 연관검색어, 카테고리, 링크후보단어들, 대기시간) {

	var popupTop = 10;
	var popupLeft = 370 + ((winCnt % 3) * 360);

	winCnt++;
	var winName = "winNaver_" + winCnt;

	// 네이버창 열기
	//popupLeft += 360;
	//if (1920 < (popupLeft + 370)) {
	//	popupLeft = 370;
	//}

	var winObj = window.open("https://m.naver.com", winName, `width=360,height=640,resizable`);	//,top=${popupTop},left=${popupLeft}`);
	await sming.waitEvent(winObj, 'load');
	winObj.moveTo(popupLeft, popupTop);
	await sming.wait(500);

	// 주검색어 검색
	await do네이버검색(winObj, 주검색어);
	var 스샷파일명1 = await sming.saveScreenshot(winName);		// 임시스샷 저장 1

	// 연관검색어 검색
	await do네이버검색(winObj, 연관검색어);

	// 카테고리가 지정되었다면
	if (카테고리) {
		//var 카테고리링크 = $(winObj.document).find('#_sch_tab li > a[role=tab]:contains(' + 카테고리 + ')')[0];

		// 2018.10.08 카테고리 선택불안 수정
		// 2018.10.10 카테고리 최대 10초까지 기다리도록
		var 카테고리링크;
		for (let j = 0; j < 20; j++) {
			카테고리링크 = $(winObj.document).find('a[role=tab]:contains(' + 카테고리 + ')')[0];
			if (카테고리링크) break;
			await sming.wait(500);
		}

		if (!카테고리링크) throw '잘못된 카테고리명: ' + 카테고리;

		카테고리링크.click();
		await sming.wait(1000);
	}

	var 스샷파일명2 = await sming.saveScreenshot(winName);		// 임시스샷 저장 2

	// 클릭가능한 후보링크들 수집
	var $boxes = $(winObj.document).find('div.api_subject_bx li.bx');

	if (링크후보단어들 && 링크후보단어들.length > 0) {
		var boxesFiltered = [];

		for (var i = 0; i < 링크후보단어들.length; i++) {

			var boxesTmp = $boxes
				.filter(function (idx) { return this.innerHTML.indexOf(링크후보단어들[i]) !== -1 })
				.toArray();

			boxesFiltered = boxesFiltered.concat(boxesTmp);
		}

		// 중복제거
		$boxes = $($.unique(boxesFiltered));
	}

	var 후보링크들 = $boxes
		.find('a')
		.filter(function (idx) { return this.innerHTML.indexOf('api_txt_lines') !== -1 })
		.toArray();

	if (!후보링크들 || 후보링크들.length === 0) throw '클릭할 수 있는 링크가 없습니다! (연관검색어: ' + 연관검색어 + ')';

	// 후보들 중 랜덤 클릭
	var sel = Math.floor((Math.random() * 후보링크들.length));
	후보링크들[sel].click();

	return {
		'winObj': winObj,
		'winName': winName,
		'스샷파일명1': 스샷파일명1,
		'스샷파일명2': 스샷파일명2,
		'대기시간': 대기시간
	};

}

// 일정시간 대기 후 스샷취합
async function do스샷취합(taskContext) {

	await sming.wait(2000);	// 페이지 로딩 대기

	await countDown(taskContext.winObj, taskContext.대기시간);

	var 스샷파일명3 = await sming.saveScreenshot(taskContext.winName);		// 임시스샷 저장 3

	// 네이버창 닫기
	taskContext.winObj.close();

	// 임시스샷으로 div 만들기
	var $div = $('<div style="width:840px; position: relative;">'
		+ `<img src="${taskContext.스샷파일명1}" width="280" height="500" />`
		+ `<img src="${taskContext.스샷파일명2}" width="280" height="500" />`
		+ `<img src="${스샷파일명3}" width="280" height="500" />`
		+ '</div>'
	);

	// 반투명 div 추가
	var $stamp = $('<div />').css({
		position: 'absolute',
		top: 0,
		left: 0,
		width: '100%',
		height: '100%',
		display: 'flex',
		justifyContent: 'center',
		alignItems: 'center',
		zIndex: 9
	}).appendTo($div);

	// 짤시각
	$('<span />')
		.css({
			top: '5px',
			left: '10px',
			padding: '5px 15px',
			position: 'absolute',
			borderRadius: '5px',
			backgroundColor: 'white',
			color: 'black',
			fontSize: '15px',
			fontWeight: 'bold',
			opacity: 0.9
		})
		.text(formatDate(new Date()))
		.appendTo($stamp);

	// 낙관이 있다면 
	var stampFile = await sming.getStampImageFileName();
	if (stampFile) {
		$stamp.append('<img src="' + stampFile + '" style="opacity:0.8" />')
	}

	// 이 div를 화면에 표시
	$div.appendTo('#container');
}

// 카운트다운
async function countDown(win, sec) {

	return new Promise((resolve) => {
		$(win.document).ready(function () {
			var $countDown = $(`<div></div>`)
				.css({
					width: 50,
					height: 50,
					backgroundColor: 'black',
					opacity: 0.7,
					position: 'fixed',
					left: 10,
					top: 10,
					zIndex: 999999,
					color: 'white',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					fontSize: '25px',
					fontWeight: 'bold'
				})
				.appendTo(win.document.body);

			var countFunc = function () {
				if (sec < 0) {
					$countDown.remove();
					resolve();
				} else {
					$countDown.text(sec);
					setTimeout(countFunc, 1000);
					sec -= 1;

					if (sec > 0) {
						win.scrollBy({ top: 300, left: 0, behavior: 'smooth' });
					} else {
						win.scroll({ top: 0, left: 0, behavior: 'smooth' });
					}
				}
			}

			countFunc();
		});
	});
}

// 네이버 검색
async function do네이버검색(winObj, 검색어) {
  throw '.';
	// 검색입력칸 찾아서 포커스
	var 검색칸 = $(winObj.document).find('#query')[0];
	if (!검색칸) 검색칸 = $(winObj.document).find('#nx_query')[0];
	검색칸.click();
	검색칸.focus();
	await sming.wait(500);

	await new Promise((resolve) => {
		$(winObj.document).ready(function () {

			var arr타이핑 = 검색칸.value.split('').fill(String.fromCharCode(8));
			arr타이핑 = arr타이핑.concat(검색어.split(''));

			// 타이핑
			var keyTyping = function () {
				if (arr타이핑.length > 0) {

					var ch = arr타이핑.shift();

					// 검색어 지우기
					if (String.fromCharCode(8) === ch) {
						검색칸.value = 검색칸.value.slice(0, -1);
					}
					// 검색어 입력
					else {
						검색칸.value += ch;
					}

					검색칸.dispatchEvent(new Event("input"));
					setTimeout(keyTyping, 100);

				} else {
					// 검색버튼 클릭
					var 검색버튼 = $(winObj.document).find('form[name="search"] button[type=submit]')[0];
					검색버튼.click();
					setTimeout(resolve, 1000);
				}
			}

			keyTyping();
		});
	});

	// 2018.10.10 검색결과 응답이 올때까지 대기
	for (var i = 0; i < 20; i++) {
		var t = $(winObj.document).find('head > title').text();
		var groups = /(.+) \: 네이버/g.exec(t);

		if (groups.length > 1 && groups[1].trim() === 검색어.trim()) return;

		await sming.wait(500);
	}

	throw '네이버 검색에 대한 응답시간 초과';
}

// 무작위 섞기
function shuffle(array) {
	if (array && array.length > 0) {
		for (let i = array.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[array[i], array[j]] = [array[j], array[i]]; // eslint-disable-line no-param-reassign
		}
	}
}

// 날짜포멧
function formatDate(date) {
	var year = date.getFullYear();
	var month = date.getMonth() + 1;
	var day = date.getDate();

	if (day < 10) day = '0' + day;
	if (month < 10) month = '0' + month;

	return `${year}-${month}-${day}`;
};
