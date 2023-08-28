import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import Button from 'react-bootstrap/Button';
import axios from 'axios';
import { useState,} from 'react';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Table from 'react-bootstrap/Table';


function App() {


  var [connectionStatus, setConnectionStatus] = useState(false);
  var [displayMetrics, setDisplayMetrics] = useState(false);
  var [totalStorageInMb, setTotalStorageInMb] = useState("-");
  var [usedStorageInMb, setUsedStorageInMb] = useState("-");
  var [availableStorageInMb, setAvailableStorageInMb] = useState("-");
  var [listFiles, setListFiles] = useState(false);
  var [files, setFiles] = useState([]);

  var [fileSizes] = useState(new Map());

  var [moreDetailsClicked, setMoreDetailsClicked] = useState(false);


  const URL = "https://monkeybox-onrender.onrender.com";

  axios.get(URL + "/status")
    .then(response => {
      connectionStatus = (response.data) ? setConnectionStatus(true) : setConnectionStatus(false);
    })
    .catch(err => {
      console.log(err);
    });

  function revokeAccess() {
    axios.get(URL + "/revoke/google")
      .then(response => {
        alert((response.data.revokeStatus) ? "Access to Google Drive Revoked" : "Access to Google Drive cannot not be Revoked");
        setConnectionStatus(false);
      })
      .catch(err => {
        console.log(err);
      });
  }

  function viewMetrics() {
    setDisplayMetrics(true);
    setListFiles(false);
    axios.get(URL + "/info/google")
      .then(response => {
        setTotalStorageInMb(response.data.totalStorageInMb);
        setUsedStorageInMb(response.data.usedStorageInMb);
        setAvailableStorageInMb(response.data.availableStorageInMb);
      })
      .catch(err => {
        console.log(err);
      });
  }

  function displayFiles() {
    setListFiles(true);
    setDisplayMetrics(false);
    axios.get(URL + "/files/google")
      .then(response => {

        setFiles(response.data);
      })
      .catch(err => {
        console.log(err);
      });
    files.forEach(item => {
      axios.get(URL + "/fileDetails?fileId=" + item.id)
      .then(response => {
        fileSizes.set(item.id, response.data.size);
      })
      .catch(err => console.log(err));
    });
  }
  
  function moreDetailsClick() {
    setMoreDetailsClicked(true);
    axios.get(URL + "/files/google")
      .then(response => {

        setFiles(response.data);
      })
      .catch(err => {
        console.log(err);
      });
    files.forEach(item => {
      axios.get(URL + "/fileDetails?fileId=" + item.id)
      .then(response => {
        fileSizes.set(item.id, response.data.size);
      })
      .catch(err => console.log(err));
    });
  }

  
  return (
    <div className="App">
      <header className="App-header">
        <h1 style={{ margin: '45px' }}>Hello, welcome to Google Drive Risk Report Clone!</h1>
        {connectionStatus ?
          <>
            <Button variant="primary" onClick={revokeAccess} style={{ marginBottom: '45px' }}>Revoke Access from Google Drive</Button>
            <Container>
              <Row>
                <Col></Col><Col></Col><Col></Col>
                <Col><Button variant="info" onClick={viewMetrics}>View Metrics</Button></Col>
                <Col><Button variant="info" onClick={displayFiles}>List Files</Button></Col>
                <Col></Col><Col></Col><Col></Col>
              </Row>
            </Container>

            {displayMetrics &&
              <Table striped bordered hover variant="dark" style={{ marginTop: '45px' }}>
                <thead>
                  <tr>
                    <th>Total Storage</th>
                    <th>Used Storage</th>
                    <th>Available Storage</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{totalStorageInMb} Mb</td>
                    <td>{usedStorageInMb} Mb</td>
                    <td>{availableStorageInMb} Mb</td>
                  </tr>
                </tbody>
              </Table>}

            {listFiles && <Table striped bordered hover variant="dark" style={{ marginTop: '45px' }}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th><Button variant="info" onClick={moreDetailsClick}>More Details</Button></th>
                </tr>
              </thead>
              <tbody>

                {files.map((item, index) => {
                  // console.log(files.length);
                  return <tr key={index}>
                    <td>{item.name}</td>
                    <td>{item.mimeType.split(".")[item.mimeType.split(".").length-1]}</td>
                    {moreDetailsClicked && item.mimeType.split(".")[2] !== "folder" && fileSizes.get(item.id)<1048576 &&
                    <td>Size: {Math.round(fileSizes.get(item.id)/1024)} Kb</td>}
                    {moreDetailsClicked && item.mimeType.split(".")[2] !== "folder" && fileSizes.get(item.id)>1048576 &&
                    <td>Size: {Math.round(fileSizes.get(item.id)/1048576)} Mb</td>}
                  </tr>
                })}

              </tbody>
              
            </Table>}
          </>

          :
          <a href={URL + '/auth/google'}><Button variant="primary">Connect Google Drive</Button></a>}

      </header>

    </div>
  );
}

export default App;
