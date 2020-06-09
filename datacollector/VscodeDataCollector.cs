using System.Threading;
using System.IO;
using System.Text;
using System.Net.Sockets;
using System;
using System.Xml;
using Microsoft.VisualStudio.TestPlatform.ObjectModel.DataCollection;
using VstestDataCollector = Microsoft.VisualStudio.TestPlatform.ObjectModel.DataCollection.DataCollector;

namespace VscodeTestExplorer.DataCollector
{
    [DataCollectorFriendlyName("VscodeDataCollector")]
    [DataCollectorTypeUri("this://is/a/random/path/that/vstest/apparently/expects/whatever/VscodeDataCollector")]
    public class VscodeDataCollector : VstestDataCollector
    {
        int port;
        void SendString(string str)
        {
            using TcpClient client = new TcpClient("localhost", port);
            using var writer = new StreamWriter(client.GetStream(), Encoding.UTF8);
            writer.Write(str);
        }
        public override void Initialize(XmlElement configurationElement,
            DataCollectionEvents events,
            DataCollectionSink dataSink,
            DataCollectionLogger logger,
            DataCollectionEnvironmentContext environmentContext)
        {
            events.TestCaseEnd += (sender, e) => SendString($"{e.TestCaseName}: {e.TestOutcome}");

            port = int.Parse(Environment.GetEnvironmentVariable("VSCODE_DOTNET_TEST_EXPLORER_PORT"));
            Console.WriteLine($"Data collector initialized; writing to port {port}.");
        }
    }
}
