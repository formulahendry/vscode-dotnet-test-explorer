using System.Linq;
using System;
using System.Net.Sockets;
using System.Text;
using System.Text.Json;

using Microsoft.VisualStudio.TestPlatform.ObjectModel;
using Microsoft.VisualStudio.TestPlatform.ObjectModel.Client;
using System.Collections.Generic;

namespace VscodeTestExplorer.DataCollector
{
    [FriendlyName("VsCodeLogger")]
    [ExtensionUri("this://is/a/random/path/that/vstest/apparently/expects/whatever/VscodeLogger")]
    public class TestBla : ITestLoggerWithParameters
    {
        int port;
        public void Initialize(TestLoggerEvents events, string testRunDirectory) { }
        public void Initialize(TestLoggerEvents events, Dictionary<string, string> parameters)
        {
            Console.WriteLine(parameters.Count);
            foreach (var kvp in parameters)
                Console.WriteLine($"{kvp.Key}: {kvp.Value}");

            port = int.Parse(parameters["port"]);
            Console.WriteLine($"Data collector initialized; writing to port {port}.");

            events.TestRunStart += (sender, e) => SendJson(new { type = "testRunStarted" });
            events.TestRunComplete += (sender, e) => SendJson(new { type = "testRunComplete" });

            events.DiscoveredTests += (sender, e)
                => SendJson(new
                {
                    type = "discovery",
                    discovered = e.DiscoveredTestCases.Select(GetFullName).ToArray()
                });

            events.TestResult += (sender, e) => SendJson(new
            {
                type = "result",
                fullName = GetFullName(e.Result.TestCase),
                outcome = e.Result.Outcome.ToString(),
                message = e.Result.ErrorMessage,
                stackTrace = e.Result.ErrorStackTrace,
            });
        }

        static string GetFullName(TestCase testCase)
            => testCase.GetProperties().Any(kvp => kvp.Key.Id == "XunitTestCase") ?
                testCase.DisplayName : testCase.FullyQualifiedName;

        void SendString(string str)
        {
            Console.WriteLine("Sending: " + str);

            using TcpClient client = new TcpClient("localhost", port);
            client.GetStream().Write(Encoding.UTF8.GetBytes(str));
        }
        void SendJson<T>(T obj) => SendString(JsonSerializer.Serialize(obj));
    }
}
