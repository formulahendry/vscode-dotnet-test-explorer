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
        public override void Initialize(XmlElement configurationElement, 
            DataCollectionEvents events, 
            DataCollectionSink dataSink, 
            DataCollectionLogger logger, 
            DataCollectionEnvironmentContext environmentContext)
        {
            Console.WriteLine("Hello World");
            events.TestCaseEnd += (sender, e) => Console.WriteLine($"{e.TestCaseName}: {e.TestOutcome}");

            // int port = int.Parse(Environment.GetEnvironmentVariable("VSCODE_DOTNET_TEST_EXPLORER_DATA_COLLECTOR_PORT"));
            // Console.WriteLine(port);
        }
    }
}
