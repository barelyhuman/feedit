import { View } from "react-native";
import {
  Appbar,
  Button,
  Card,
  ProgressBar,
  Text,
  useTheme,
} from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { XMLBuilder, XMLParser } from "fast-xml-parser";
import { pick, types } from "@react-native-documents/picker";
import { useOpmlImportStore } from "../store/opmlImportStore";
import { useFeedStore } from "../lib/reactive";
import { useCallback } from "react";

const SettingsPage = () => {
  const navigation = useNavigation();

  const total = useOpmlImportStore((s) => s.total);
  const imported = useOpmlImportStore((s) => s.imported);
  const isImporting = useOpmlImportStore((s) => s.isImporting);
  const error = useOpmlImportStore((s) => s.error);
  const startImport = useOpmlImportStore((s) => s.startImport);
  const updateProgress = useOpmlImportStore((s) => s.updateProgress);
  const finishImport = useOpmlImportStore((s) => s.finishImport);
  const setError = useOpmlImportStore((s) => s.setError);
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
          await addFeed(url);
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
      <Card style={{ marginLeft: 8, marginRight: 8 }}>
        <Card.Title title="Import / Export" />
        <Card.Content>
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
          <Button
            mode="contained"
            onPress={handleImportOPML}
            disabled={isImporting}
          >
            Import Feeds from OPML
          </Button>
          {error && <Text style={{ color: "red", marginTop: 16 }}>{error}
          </Text>}
        </Card.Content>
      </Card>
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
