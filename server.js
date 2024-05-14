import axios from 'axios';
import express from 'express';

const app = express();

app.use(express.json());

const PORT = 8080;
const accessToken = 'EAAVZBobCt7AcBO0gtvcZAVwb3YXwbXONbQwZCYjyUVp9xNjZBXqHXxwz7Lpjm4yQZAKHe8DbNq7MD6kV3pMTqbAZAAt3YA4cYdZBb7m2bZBT0j36AVp1F2LzdoNZAJCoA8anEEV7v7F8PnBXXMSY8AE9y92OMjWgm3hviocs3QINpLwq7siOGyt0xxZCPxUWETObYZD';
const WEBHOOK_VERIFY_TOKEN = 'NOICE';
const pageID = "254960371025173"
const userIGSID = "17841466409033489"


//private replies
//need permissions

//product message, carousel
//service temp unavailable
const inputMap = new Map();
var currNode=0
var adjList;
var flow;
var name;
app.post("/ig-flowdata" , async (req,res) => {
    adjList=req.body.adjacencyList;
    flow = req.body.nodes;
    console.log("REC DATA: ", req.body)

    res.status(200).json({ success: true, message: "flowdata sent successfully"});
})

//quick replies
async function sendQuickReplies(main_text, replies, rec_id){
    let quick_replies=[]
    for(let i=0;i<replies.length;i++){
        const reply = replies[i];
        quick_replies.push({
            type : "postback",
            title : flow[reply].body,
            payload : flow[reply].id 
        })
    }
    try {
        const response = await axios.post(`https://graph.facebook.com/v19.0/${pageID}/messages?access_token=${accessToken}`, {
            recipient : {
                id : rec_id
              },
              messaging_type : "RESPONSE",
               message :{
                 text : main_text,
                 quick_replies :quick_replies
              }
        });
        return response.data
    } catch (error) {
        console.error("ERROR in sending quick reply", error.response.data);
        return null;
    }
}

async function sendButtons(buttons, main_text, rec_id){
    let button_rows=[]
    for(let i=0;i<buttons.length;i++){
        const buttonNode = buttons[i];
        button_rows.push({
            type : "postback",
            title : flow[buttonNode].body,
            payload : flow[buttonNode].id.toString()
        })
    }
    console.log("BUTTON ROWS ", button_rows)
    try {
        const response = await axios.post(`https://graph.facebook.com/v19.0/${pageID}/messages?access_token=${accessToken}`, {
            recipient : {
                id : rec_id
              },
               message :{
                attachment : {
                    type : "template",
                    payload: {
                        template_type : "button",
                        text: main_text,
                        buttons : button_rows
                    }
                }
              }
        });
        return response.data
    } catch (error) {
        console.error("ERROR in sending buttons", error.response.data);
        return null;
    }
}

async function sendString(message, rec_id){
    try {
        const response = await axios.post(`https://graph.facebook.com/v19.0/${pageID}/messages?access_token=${accessToken}`, {
            recipient : {
                id : rec_id
              },
               message :{
                text: message
              }
        });
        return response.data
    } catch (error) {
        console.error("ERROR in sending string message", error.response.data);
        return null;
    }
}
//user profile API, generic template, button template
//product template, private replies

var nextNode;

async function sendNodeMessage(node, rec_id){
    if(node == 0 || nextNode.length != 0){
        console.log("NODE: ", node)
        nextNode = adjList[node];
        const node_message = flow[node].body;
        if(flow[node].type === "button"){
            const buttons = nextNode;
            sendButtons(buttons, node_message, rec_id)
        }
        else if(flow[node].type === 'quick replies'){
            const replies = nextNode;
            sendQuickReplies(node_message, replies, rec_id)
        }
        else if(flow[node].type === "string"){
            await sendString(node_message, rec_id)
            currNode = nextNode[0];
            sendNodeMessage(currNode, rec_id);
        }
        else if(flow[node].type === "Input"){
            sendString(node_message, rec_id)
        }
    }
    else {
        currNode = 0;
        nextNode = adjList[currNode];
    }
}



async function replyToMentions(entryID, mediaID, commentID, message){
    try {
        const response = await axios.post(`https://graph.facebook.com/${entryID}/mentions`, {
            message: message,
            comment_id : commentID,
            media_id: mediaID,
            access_token: accessToken
        });
        return response.data
    } catch (error) {
        console.error("ERROR ", error.response.data);
        return null;
    }
}

async function replyToComment(mediaID, commentID, message) {
    try {
        const response = await axios.post(`https://graph.facebook.com/${commentID}/replies`, {
            message: message,
            access_token: accessToken
        });
        return response.data;
    } catch (error) {
        console.error("ERROR in replying to comment", error.response.data);
        return null;
    }
}

async function getUserInfo(rec_id) {
    try {
        const response = await axios.get(`https://graph.facebook.com/v19.0/${rec_id}`, {
            params: {
                access_token: accessToken
            }
        });
        console.log("RESONSE " ,response.data)
        const name = response.data.name;
        return name

    } catch (error) {
        console.error('Error fetching user account information:', error);
        return null;
    }
}


async function uploadMedia(image_url){

    //uploading image in container
    const response = await axios.post(`https://graph.facebook.com/v19.0/${userIGSID}/media` ,{
        access_token : accessToken,
        image_url : image_url
    });
    const creation_id = response.data.id;

    //publishing container to instagram page
    const publishResponse = await axios.post(`https://graph.facebook.com/v19.0/${userIGSID}/media_publish` ,{
        access_token : accessToken,
        creation_id : creation_id
    })
    const mediaID=publishResponse.data.id;

    console.log("MEDIA SUCCESSFULLY UPLOADED WITH MEDIA ID: " ,mediaID)
}


// Example usage:


axios.post(`https://graph.facebook.com/v19.0/${pageID}/subscribed_apps?subscribed_fields=messages&access_token=${accessToken}`)
var last_timestamp;
app.post("/webhook", async (req, res) => {
    
    console.log("RECEIVED WEBHOOK:", JSON.stringify(req.body, null, 2));
    const bodyType = req.body.entry?.[0].changes?.[0].field;
    //replying to commments
    if(bodyType== "comments") {
        const mediaID = req.body.entry?.[0].changes?.[0].value?.media?.id;
        const commentID = req.body.entry?.[0].changes?.[0].value?.id;
        const message="Hi, I am batman. How can I assist you today?"
        const parentID = req.body.entry?.[0].changes?.[0].value?.parent_id;
        const value = req.body.entry?.[0].changes?.[0].value;
        console.log({
            "commentFrom" : value.from.username,
            "text" : value.text
        })

        if(parentID == undefined) replyToComment(mediaID, commentID, message);
    }

    //replying to mentions
    else if(bodyType == "mentions") {
        const mention_reply = "Hi, did someone call batman?"
        const commentID = req.body.entry?.[0].changes?.[0].value?.comment_id 
        const mediaID = req.body.entry?.[0].changes?.[0].value?.media_id
        const entryID = req.body.entry?.[0].id

        replyToMentions(entryID, mediaID, commentID, mention_reply);

    }

    //replying to messages
    else {
        const message_body=req.body.entry?.[0].messaging?.[0]
        const rec_id = message_body.sender.id;

        if(rec_id != userIGSID){
        
        
        const postback = message_body?.postback;
        const message = message_body?.message;
        // name = await getUserInfo(rec_id);
        // console.log("RECID: ", rec_id)
        if(postback){
            let postbackID=parseInt(postback.payload);
            console.log("POSTBACKID ", postbackID)
            nextNode.forEach(i => {
                if(flow[i].id == postbackID){
                  currNode = i;
                  nextNode = adjList[currNode];
                  currNode = nextNode[0];
                  console.log("CURRNODE ", currNode)
                  sendNodeMessage(currNode, rec_id);
                  return;
                }
            })
        }
        else if(message){
            if(currNode!=0){
                inputMap.set(currNode, message.text)
                currNode=nextNode[0];
            }
            sendNodeMessage(currNode, rec_id)
        }
        }
    }


    res.sendStatus(200);
    
});



app.get("/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === WEBHOOK_VERIFY_TOKEN) {
        res.status(200).send(challenge);
        console.log("Webhook verified successfully!");
    } else {
        res.sendStatus(403);
    }
});
app.get("/", (req, res) => {
    res.send(`<pre>Nothing to see here. Checkout README.md to start.</pre>`);
});

const server = app.listen(PORT, () => {
    console.log(`Server is listening on port: ${PORT}`);
});

const image_url="https://firebasestorage.googleapis.com/v0/b/nurenai.appspot.com/o/images%2Fkrishna.jpg?alt=media&token=8dc0c043-9e2e-41c8-b2d9-958d9229eb62";
// sendQuickReplies("choose a color" , "red",  "green" ,"366085079221659");