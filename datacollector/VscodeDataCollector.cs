using System;
using System.Net.Sockets;
using System.Text;
using System.Xml;
using System.Text.Json;
using Microsoft.VisualStudio.TestPlatform.ObjectModel.DataCollection;
using VstestDataCollector = Microsoft.VisualStudio.TestPlatform.ObjectModel.DataCollection.DataCollector;

namespace VscodeTestExplorer.DataCollector
{
    [DataCollectorFriendlyName("VscodeDataCollector")]
    [DataCollectorTypeUri("this://is/a/random/path/that/vstest/apparently/expects/whatever/VscodeDataCollector")]
    public class VscodeDataCollector : VstestDataCollector
    {
        int port;
        public override void Initialize(XmlElement configurationElement,
            DataCollectionEvents events,
            DataCollectionSink dataSink,
            DataCollectionLogger logger,
            DataCollectionEnvironmentContext environmentContext)
        {
            port = int.Parse(Environment.GetEnvironmentVariable("VSCODE_DOTNET_TEST_EXPLORER_PORT"));
            Console.WriteLine($"Data collector initialized; writing to port {port}.");

            events.TestCaseEnd += (sender, e) => SendJson(new
                {
                    type = "testResult",
                    testCaseName = e.TestCaseName,
                    outcome = e.TestOutcome.ToString()
                });
        }
        void SendString(string str)
        {
            Console.WriteLine("Sending: " + str);

            using TcpClient client = new TcpClient("localhost", port);
            client.GetStream().Write(Encoding.UTF8.GetBytes(str));
        }
        void SendJson<T>(T obj) => SendString(JsonSerializer.Serialize(obj));
    }
}
