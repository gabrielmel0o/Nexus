@echo off
REM Entra na pasta deste arquivo, mesmo quando ele e aberto de outro lugar.
cd /d "%~dp0"

REM Confere se o Node esta disponivel, sem mostrar detalhes no terminal.
node --version >nul 2>&1
if errorlevel 1 (
    echo O Node.js nao foi encontrado. Baixe e instale em https://nodejs.org.
    echo Depois da instalacao, abra este arquivo novamente.
    pause
    exit /b 1
)

REM Confere somente a existencia do arquivo. Nunca mostra a chave ou o conteudo.
if not exist "backend\.env" (
    echo Falta o arquivo backend\.env.
    echo Copie backend\.env.example para backend\.env e coloque sua chave do Gemini.
    echo Depois, abra este arquivo novamente.
    echo Para sair, feche esta janela.
    pause
    REM Mantem o aviso aberto mesmo se o pause receber uma tecla imediatamente.
    cmd /d /k
    exit /b 1
)

REM Abre o servidor em uma janela que continua aberta para mostrar possiveis erros.
start "NEXUS backend" /D "backend" cmd /k npm start

REM Aguarda tres segundos e abre o universo no navegador padrao.
timeout /t 3 /nobreak >nul
start "" "nexus\index.html"

echo NEXUS iniciado. Para encerrar, feche a janela do servidor.
