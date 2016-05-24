@echo off
setlocal enabledelayedexpansion
set INTEXTFILE=settings.json
set OUTTEXTFILE=settings.tmp
set CURRENT=%CD%

call npm set progress=false

IF EXIST "link.io" GOTO STEP1
    mkdir "link.io"

:STEP1
    cd "link.io"

    IF EXIST "link.io.server" GOTO STEP2
    echo Link.IO server:
    echo|set /p=    1) Cloning server from GitHub...
    git clone -q "https://github.com/Chaniro/link.io.server.git"
    if %ERRORLEVEL% == 0 goto :NEXT1
    echo Please install Git and add it to the PATH variable
    goto :END
:NEXT1
    echo ok
    echo|set /p=    2) Installing dependencies...
    cd "link.io.server"
    call npm --loglevel=silent install > NUL 2>&1
    if %ERRORLEVEL% == 0 goto :NEXT2
    echo Please install NPM and add it to the PATH variable
    goto :END
:NEXT2
    echo ok
    echo.
    cd ".."

:STEP2
    IF EXIST "link.io.server.monitoring" GOTO STEP3
    echo Link.IO monitoring server:
    echo|set /p=    1) Cloning monitoring server from GitHub...
    git clone -q "https://github.com/Leelow/link.io.server.monitoring.git"
    echo ok
    echo|set /p=    2) Installing dependencies...
    cd "link.io.server.monitoring"
    call npm --loglevel=silent install > NUL 2>&1
    echo ok

:STEP3
    echo.
    echo ----- Server setup -----
    set /p SERVERIP=Server adresse (host or ip):
    set /p SERVERPORT=Server port:
    set /p MONITORINGPORT=Monitoring port:

    echo.
    echo ----- Administrator account -----
    set /p ADMMAIL=Mail:
    set /p ADMPASS=Password:

    xcopy "%CD%\scripts\start\link.io.bat" "%CD%\.." > NUL 2>&1

    for /f "tokens=1,* delims=¶" %%A in ( '"type %INTEXTFILE%"') do (
        SET string=%%A
        SET step1=!string:8081=%MONITORINGPORT%!
        SET step2=!step1:8080=%SERVERPORT%!
        SET step3=!step2:admin@link.io=%ADMMAIL%!
        SET step4=!step3:admin=%ADMPASS%!
        SET modified=!step4:localhost=%SERVERIP%!

        echo !modified! >> %OUTTEXTFILE%
    )

    del %INTEXTFILE%
    rename %OUTTEXTFILE% %INTEXTFILE%

    echo.
    echo Configuration done.
    echo If you want to change these configurations later, please edit:
    echo     -^>   link.io/link.io.server.monitoring/settings.json
    echo You can start the server with link.io/start.bat

cd %CURRENT%
call npm set progress=true

:END