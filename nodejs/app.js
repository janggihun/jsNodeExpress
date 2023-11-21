const ejs = require('ejs')
const express = require('express')
const app = express()
var bodyParser = require('body-parser')
var cookieParser = require('cookie-parser')

let loginId = null; //로그인시 id값 (전역변수)
let boardNum = null;

const mysql = require("mysql2") // DB연동
const connection = mysql.createConnection({

    host: "localhost",
    user: "root",
    password: "1234",
    port: "3306",
    database: "mydb"

});

connection.connect(); //mysql 접속 //나중에 해제메소드도 넣어야됨

app.use(cookieParser());
app.set('port', process.env.PORT || 3000);
app.set('view engine', 'ejs')
app.set('views', './views')

app.use(bodyParser.urlencoded({
    extended: false
}))
//////////////////////////////////////////////////////////////////////////////////

//라우팅
app.get('/board', function (req, res) { //게시판 화면 

    if (req.cookies['num'] === undefined) {
        connection.query('select * from board order by b_cnt desc limit ? , 6', 0, (error, result) => { //게시판 내용
            if (error) throw error

            res.render('board', {
                data: result

            })
            return;
        });

    } else {
        let page = parseInt(req.cookies['num']); // 쿠키의 값을 가지고 오면 string으로 받는다. 이걸 int로 변환해 주지 않는다면 mysql에서 찾지 못하게 된다.

        connection.query('select * from board order by b_cnt desc limit ? , 5', page, (error, result) => { //게시판 내용
            if (error) throw error

            res.render('board', {
                data: result

            })
            return;
        });
    }

});

app.get('/profile', function (req, res) { //내정보
    try {
        connection.query('select * from member where id = ? ', loginId, (error, result, fields) => {
            // if (error) throw error
            res.render('profile', {
                data: result
            })
        });
        return;
    } catch {

        res.render('/')

    }
    res.redirect('/')


});


app.get('/', function (req, res) { //로그인창 가는 길(셋팅)
    res.clearCookie('sameName')
    res.clearCookie('login')
    res.clearCookie('num')
    res.clearCookie('title')
    res.clearCookie('delete')
    loginId = null;
    res.render('login')

})

app.get('/register', function (req, res) { //회원가입창
    res.clearCookie('sameName')
    res.clearCookie('id')
    res.clearCookie('cc')
    res.render('register')
})
app.get('/contents', function (req, res) { // 아이디/비번찾기
    res.render('contents')
})

app.get('/find', function (req, res) { // 아이디/비번찾기
    res.render('find')
})
app.get('/login', function (req, res) { // 로그인창
    res.render('login')
})

app.get("/cookie", (req, res) => { // 쿠키 가지고 오기
    loginId = null;
    res.render("cookie");
})
app.listen(4000, () => { // 4000포트에서 실행

    console.log("서버가 실행되었습니다.");

})

//////////////////////////////////////////////////////////////////////////////////////////////

app.post('/contactProc', function (req, res) { //  회원가입

    const name = req.body.name;
    const id = req.body.id;
    const pwd = req.body.pwd;
    const phone = req.body.phone;
    const email = req.body.email;


    //중복 아이디라면 가입하지 못하게 막아야됨 >> 완료
    try {
        connection.query('insert into member(name,id,pwd,phone,email) values(?,?,?,?,?)', [name, id, pwd, phone, email], (error, result, fields) => {

            if (error) {
                console.log(error);
                res.cookie('sameName', 'true')
                res.render('register')
                return;

            } else {

                res.render('login')
            }
        })
    } catch {
        res.render('login')
    }
})

app.post('/findIdPw', function (req, res) { // 아이디비번찾기
    res.clearCookie('id');
    res.clearCookie('cc');

    // console.log(req.body.name);
    const name = req.body.name;
    const phone = req.body.phone;

    connection.query('select * from member where name = ? and phone = ?', [name, phone], (error, result) => {
        result === 'false'
        try {
            if (error) {
                error
            } else {
                if (result != false) {
                    res.render('finishfind', {
                        data: result
                    })
                    return;
                }
            }
        } catch {
            return res.redirect('/');
        }
        res.redirect('/find');
    })
});


app.post('/loginCheck', function (req, res) { // 로그인 확인
    const id = req.body.id;
    const pwd = req.body.pwd;
    const cc = req.body.cc //아이디기억박스용

    connection.query('select * from member where id = ? and pwd = ?', [id, pwd], (error, result) => {
        result === 'false'
        try {
            if (error) {
                error
            } else {
                if (result != false) {

                    loginId = id // login시에 id값을 저장 ; //mysql 검색시 사용
                    res.cookie('id', id) //쿠키 만들기
                    res.cookie('cc', cc) //쿠키 만들기
                    // res.clearCookie('id',id) // 쿠키 삭제하는법       
                    res.redirect('/board')
                    return;
                }

            }

        } catch {

            return res.redirect('/');
        }

        res.cookie('login', 'false') //실패확인용 쿠키
        return res.render('login');
    })

});
app.post('/check', function (req, res) { //  아이디 중복체크 메서드
    
    connection.query('select * from member where id = ?', req.body.id, (error, result, fields) => {
        try {
            if (error) {
                console.log(error);
            }
            if (result[0].id) { //결과값이 있다.

                res.cookie('sameName', 'true') //같은 아이디 존재
                res.render('register')
                return;
            } else {

                return;
            }

        } catch {
            //mysql에서 오류가 났다는것은 같은값이 없다라는 뜻/
            res.cookie('sameName', req.body.id) // 같은아이디 없음
            // console.log('없는 아이디 오류'); // 즉,id생성가능
            res.render('register')

        }
    })


})
app.get('/readBoard', function (req, res) { // 보드 읽기
    let cnt = req.query.cnt

    connection.query('select * from board where b_cnt = ?', cnt, (error, result, fields) => {
        try {

            res.render('readBoard', {
                data: result
            })
        } catch {
            console.log('readboard error');
            res.redirect('/')
        }
    });

})

app.get('/deleteBoard', function (req, res) { // 보드 삭제
    const boardNum = req.query.num

    connection.query('delete from board where b_cnt = ? and b_id =?', [boardNum, loginId], (error, result) => {
        // console.log(result);
        // console.log(result.affectedRows);
        if (result.affectedRows === 1) {
            // console.log("찾음");
            res.cookie("delete", "true")
        } else {
            // console.log("못찾음");
            res.cookie("delete", "false")
        }
        res.redirect('/board')
    });


})

app.get('/searchBoard', function (req, res) { // 게시판 제목 찾기

    let title = decodeURI(req.cookies['title'])


    connection.query('select * from board where b_title like ? order by b_cnt desc limit 5', '%' + title + '%', (error, result, fields) => {
        try {

            res.clearCookie('title')
            res.render('board', {
                data: result
            })

            return;
        } catch {
            res.clearCookie('title')
            console.log('searchBoard error');
            res.redirect('/board')
            return;
        }
    });

})


///////////////////////////////////     김동근    //////////////////////////////////////////////////

app.get('/retouch', function (req, res) { //
    connection.query('select * from member where id = ?', loginId, (error, result, fields) => {
        if (error) throw error;
        // console.log(result);
        res.render('retouch', {
            data: result
        })
    });

})


app.post('/aaa', function (req, res) { //수정
    const a = req.body.pw1
    const b = req.body.pw2
    connection.query('update member set pwd = ? where id = ? ', [b, loginId], (error, result, fields) => {
        if (error) throw error;
        // console.log(result);
        res.render('login')
    })
})

app.get('/secession', function (req, res) { //회원탈퇴
    connection.query('delete from member where id = ?', loginId, (error, result, fields) => {
        if (error) throw error;
        // console.log(result);
        res.render('login')
    })
})


app.post('/signup', function (req, res) { // board 등록
    const t = req.body.text
    const c = req.body.content
    connection.query('insert into board(b_title, b_content, b_id) values(?,?,?)', [t, c, loginId], (error, result, fields) => {
        if (error) throw error;
        // console.log(result);
        res.clearCookie('num')
        res.redirect('/board')
    })

})
//////////////////////////////////    박용현    /////////////////////////////////////////////////////////












//////////////////////////////////////    정혜린   ///////////////////////////////////////////////