import { View } from "react-native";
import { Appbar, Button, ProgressBar, Text } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { XMLBuilder, XMLParser } from "fast-xml-parser";
import { pick, types } from "@react-native-documents/picker";
import { useOpmlImportStore } from "../store/opmlImportStore";
import { useFeedStore } from "../lib/reactive";
import { useCallback } from "react";

const SettingsPage = () => {
  const navigation = useNavigation();

  const {
    total,
    imported,
    isImporting,
    error,
    startImport,
    updateProgress,
    finishImport,
    setError,
  } = useOpmlImportStore();

  const addFeed = useFeedStore((state) => state.addFeed);

  const handleImportOPML = useCallback(async () => {
    try {
      const result = await pick({
        type: types.allFiles,
        allowMultiSelection: false,
      });
      if (!result.length) return;
      const uri = result[0].uri;
      const response = await fetch(uri);
      const xmlText = await response.text();
      const parser = new XMLParser({
        attributeNamePrefix: "",
        ignoreAttributes: false,
        ignoreDeclaration: true,
        parseTagValue: true,
        preserveOrder: true,
        trimValues: false,
      });
      const parsedText = parser.parse(xmlText, true);
      const outlines = getOutlines(parsedText);
      startImport(outlines.length);
      let importedCount = 0;
      for (const outline of outlines) {
        const url = outline.xmlUrl;
        if (url) {
          addFeed(url);
        }
        importedCount++;
        updateProgress(importedCount);
      }
      finishImport();
    } catch (e: any) {
      setError(e.message || "Failed to import OPML");
    }
  }, [addFeed, startImport, updateProgress, finishImport, setError]);

  return (
    <View>
      <Appbar.Header>
        <Appbar.BackAction
          onPress={() => {
            navigation.navigate({ name: "Home" });
          }}
        />
        <Appbar.Content title={"Settings"} />
      </Appbar.Header>
      <View style={{ padding: 16 }}>
        <Button
          mode="contained"
          onPress={handleImportOPML}
          disabled={isImporting}
        >
          Import Feeds from OPML
        </Button>
        {isImporting && (
          <View style={{ marginTop: 16 }}>
            <Text>
              Importing {imported} of {total} feeds...
            </Text>
            <ProgressBar
              progress={total ? imported / total : 0}
              style={{ marginTop: 8 }}
            />
          </View>
        )}
        {error && <Text style={{ color: "red", marginTop: 16 }}>{error}</Text>}
      </View>
    </View>
  );
};

export default SettingsPage;

const getOutlines = (xml) => {
  const outlines = [];
  xml.forEach((xmlNode) => {
    const opmlNodes = xmlNode.opml || [];
    opmlNodes.forEach((opmlNode) => {
      const body = opmlNode.body || [];
      body.forEach((bodyNode) => {
        if ("outline" in bodyNode) {
          const allAttrKeys = Object.keys(bodyNode[":@"]);
          const outline = Object.fromEntries(allAttrKeys.map((d) => {
            return [d, bodyNode[":@"][d]];
          }));
          outlines.push(outline);
        }
      });
    });
  });
  return outlines;
};
