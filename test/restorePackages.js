let { exec } = require('child_process');
let log = (err, stdout, stderr) => console.log(stdout)

exec("dotnet restore ./test/fsxunittests/FSharpTests.fsproj", log);
exec("dotnet restore ./test/mstest/MSTestTests.csproj", log);
exec("dotnet restore ./test/nunit/NunitTests.csproj", log);
exec("dotnet restore ./test/nunitNet5/NunitTests.csproj", log);
exec("dotnet restore ./test/xunittests/XunitTests.csproj", log);