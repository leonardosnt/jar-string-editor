cd ../

echo Building...

yarn build

cd ./build
now.cmd -p -c ./now.json

read