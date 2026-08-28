@echo off
cd /d "%~dp0"
javac -cp "lib/junit-platform-console-standalone-1.14.4.jar" NumberProcessor.java NumberProcessorTest.java
java -jar lib/junit-platform-console-standalone-1.14.4.jar --class-path . --select-class NumberProcessorTest
