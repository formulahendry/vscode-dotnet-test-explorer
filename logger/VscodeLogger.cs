using System.Linq;
using System;
using System.Net.Sockets;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

using Microsoft.VisualStudio.TestPlatform.ObjectModel;
using Microsoft.VisualStudio.TestPlatform.ObjectModel.Client;
using System.Collections.Generic;

namespace VscodeTestExplorer.Logger
{
    [FriendlyName("VsCodeLogger")]
    [ExtensionUri("this://is/a/random/path/that/vstest/apparently/expects/whatever/VscodeLogger")]
    public class VsCodeLogger : ITestLoggerWithParameters
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

            events.TestRunStart += (sender, e) => StartSendJson(new { type = "testRunStarted" });
            events.TestRunComplete += (sender, e) =>
            {
                StartSendJson(new { type = "testRunComplete" });
                Flush();
            };

            events.DiscoveredTests += (sender, e)
                => StartSendJson(new
                {
                    type = "discovery",
                    discovered = e.DiscoveredTestCases.Select(GetFullName).ToArray()
                });
            events.DiscoveryComplete += (sender, e) => Flush();

            events.TestResult += (sender, e) => StartSendJson(new
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

        async Task SendString(string str)
        {
            // Console.WriteLine("Sending: " + str);

            using TcpClient client = new TcpClient();
            await client.ConnectAsync("localhost", port);
            await client.GetStream().WriteAsync(Encoding.UTF8.GetBytes(str));
        }

        List<Task> tasks = new List<Task>();
        void StartSendJson<T>(T obj)
        {
            var task = SendString(JsonSerializer.Serialize(obj));
            lock (tasks)
            {
                tasks.Add(task);
            }
        }

        void Flush()
        {
            Task[] _tasks;
            lock (tasks)
            {
                _tasks = tasks.ToArray();
                tasks.Clear();
            }
            Task.WaitAll(_tasks);
        }
    }
}
