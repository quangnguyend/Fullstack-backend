/**
 * EmailCopyList is a list of body copies that can be injected to the email htmlBody.
 * The header and footer are in the default.json
 */

var EmailContentList = {
  // active & onboarding / pending & waitlist are exactly same.
  // confirmEmail is not being used yet but have a template image on Avocode for this case. (~Lucy)
  active: {
    html: `
      <p class="lead">Welcome to Auvenir!</p><br><br>
      <p>Congratulations, you have been selected to be part of our exclusive beta.
        When you're ready to audit smarter, click the button below
        to create and/or login to your Auvenir account.
      </p><br><br>
      <center>
        <a class="loginButton" href='%url%/checkToken?token=%token%&email=%email%'>Login</a>
      </center><br><br>
      <p>We welcome your feedback, ideas and suggestions to make the audit experience better. Send us an email at
        <a style="color:#50baa8;" href="mailto:feedback@auvenir.com%5C%22">feedback@auvenir.com</a>.
      </p><br><br>`
  },

  onboarding: {
    html: `
      <p class="lead">Welcome to Auvenir!</p><br><br>
      <p>Thank you for using our secure login system.</p><br>
      <p>When you're ready to audit smarter, click the link below
         to create and/or login to your Auvenir account.</p><br><br>
      <center>
        <a class="loginButton" href='%url%/checkToken?token=%token%&email=%email%'>Login</a>
      </center><br><br>
      <p>We welcome your feedback, ideas and suggestions to make the audit experience better. Send us an email at
        <a style="color:#50baa8;" href="mailto:feedback@auvenir.com%5C%22">feedback@auvenir.com</a>.
      </p><br><br>`
  },

  waitlist: {
    html: `
      <p class="lead">Hello,</p><br><br>
      <p>We are excited about your interest in
        Auvenir, where we are on a mission to make the audit process better for auditors and their clients. We'll make sure to keep you up to date on our progress and will let you know when you can start using the platform.</p><br><br>
      <p>Meanwhile, you can follow us on:
        <a style='color:#50baa8;' href='https://twitter.com/auvenir'>Twitter</a>, <a style='color:#50baa8;' href='https://www.linkedin.com/company/auvenir'>LinkedIn</a> or <a style='color:#50baa8;' href='https://www.facebook.com/auvenir/'>Facebook</a> and
        e-mail us at <a style='color:#50baa8;' href='mailto:feedback@auvenir.com%5C%22'>info@auvenir.com</a>
      </p><br><br>`
  },

  pending: {
    html: `
      <p class="lead">Hello,</p><br><br>
      <p>We are excited about your interest in
        Auvenir, where we are on a mission to make the audit process better for auditors and their clients. We'll make sure to keep you up to date on our progress and will let you know when you can start using the platform.</p><br><br>
      <p>Meanwhile, you can follow us on:
        <a style='color:#50baa8;' href='https://twitter.com/auvenir'>Twitter</a>, <a style='color:#50baa8;' href='https://www.linkedin.com/company/auvenir'>LinkedIn</a> or <a style='color:#50baa8;' href='https://www.facebook.com/auvenir/'>Facebook</a> and
        e-mail us at <a style='color:#50baa8;' href='mailto:feedback@auvenir.com%5C%22'>info@auvenir.com</a>
      </p><br><br>`
  },

  verified: {
    html: `
      <p class="lead">Welcome to Auvenir!</p><br><br>
      <p>Your account has been authenticated and is now active.
        When you are ready to audit smarter, click the button below.
      </p><br><br>
      <center>
        <a class="loginButton" href='%url%/checkToken?token=%token%&email=%email%'>Get Started</a>
      </center><br><br>
      <p>We welcome your feedback, ideas and suggestions to make the audit experience better. Send us an email at
        <a style="color:#50baa8;" href="mailto:feedback@auvenir.com%5C%22">feedback@auvenir.com</a>.
      </p><br><br>`
  },

  clientFilesReady: {
    html: `
      <p class="lead">Hi, %auditorFirstName%</p><br><br>
      <p>%userFirstName% %userLastName% has uploaded all of the files you have requested for
      %engagementName% audit. They are now ready for you to download and
      review. Click the link below to view the files before downloading.</p><br><br>
      <center>
        <a class="loginButton" href="%url%/checkToken?token=%token%&email=%email%&eid=%engagementID%">View files</a>
      </center><br><br>
      <p>We welcome your feedback, ideas and suggestions to make the audit experience better. Send us an email at
        <a style="color:#50baa8;" href="mailto:feedback@auvenir.com%5C%22">feedback@auvenir.com</a>.
      </p><br><br>`
  },

  notifyClient: {
    html: `
      <p class="lead">Hi %userFirstName%</p><br><br>
      <p>Your audit opinion has been uploaded by your auditor!</p><br><br>
      <p>Login to Auvenir and go to your Files section to download.</p><br><br>
      <center>
        <a class="loginButton" href="%url%/checkToken?token=%token%&eid=%engagementID%&email=%email%">Check your engagement</a>
      </center><br><br>
      <p>We welcome your feedback, ideas and suggestions to make the audit experience better. Send us an email at
        <a style="color:#50baa8;" href="mailto:feedback@auvenir.com%5C%22">feedback@auvenir.com</a>.
      </p><br><br>`
  },

  sendEngagementInvite: {
    html: `
      <p class="lead">Hi %userFirstName%,</p><br><br>
      <p>%auditorFirstName% %auditorLastName% has invited you to join Auvenir to complete your financial audit.
      Please click below to get started!</p><br><br>
      <center>
        <a class="loginButton" href='%url%/acceptInvite?token=%token%&eid=%engagementID%&email=%email%'>Start Your Audit</a>
      </center><br><br>
      <p>Auvenir is on a mission to make financial audits smarter, more pleasant, and more efficient. Our technology helps auditors work with their clients better.</p><br><br>
      <p>Here are some of the benefits.</p><br>
      <p>- Secure, cloud based platform to upload your documents</p>
      <p>- Customized, detailed notifications and task management system keeps everyone on schedule and on budget</p>
      <p>- Bank and accounting system integrations</p><br><br>
      <p>We welcome your feedback, ideas and suggestions to make the audit experience better. Send us an email at
        <a style="color:#50baa8;" href="mailto:feedback@auvenir.com%5C%22">feedback@auvenir.com</a>.</p><br>
      <p>Welcome to the future of financial audit, now!</p>`
  },

  sendSuggestion: {
    html: `
      <p class="lead">Hi, Auvenir</p><br><br>
      <p>%userFirstName% %userLastName% uses an accounting software not on the list:</p><br>
      <p>%userText%</p><br><br>
      <p>This was an automated message.</p>`
  },

  sendErrorMsg: {
    html: `
      <p>There was error in registering user's device. \nUser AuthID: %authID%\nError Message: %error%</p>`
  }
}

var generateHtml = function (emailType) {
  var sectionInsert = EmailContentList[emailType].html
  var emailContent = `
  <head>
    <meta name="viewport" content="width=device-width">
    <meta http-equiv="content-type" content="text/html; charset=UTF-8">
    <title>Auvenir</title>
    <link href="http://fonts.googleapis.com/css?family=Lato:400,700" rel="stylesheet" type="text/css">

    <style type="text/css">
      *{
        margin:0;
        padding:0;
      }
      *{
        font-family:"Lato","Helvetica Neue","Helvetica",Helvetica,Arial,sans-serif;
        color:#363a3c;
      }
      img{
        max-width:100%;
      }
      .collapse{
        margin:0;
        padding:0;
      }
      body{
        -webkit-font-smoothing:antialiased;
        -webkit-text-size-adjust:none;
        width:100% !important;
        height:100%;
      }
      .loginButton{
        color:#fff;
        background-color:#599ba1;
        text-align:center;
        border:none;
        border-radius:4px;
        text-decoration:none;
        font-size:16px;
        font-weight:400;
        padding:10px 54px;
      }
      table.body-wrap{
        width:100%;
        position:relative;
        top:0;
      }
      buttonTD{
        text-align:center;
      }
      table.wrapper{
        border:none;
        padding:0;
        width:100%;
        position:relative;
        border-collapse:collapse;
      }
      table.footer-wrap{
        width:100%;
        clear:both !important;
        position:relative;
      }
      .footerElement{
        display:block;
        color:#707070;
      }
      .imageHolder{
        margin-bottom:10px;
      }
      .punchLine{
        margin-bottom:20px;
      }
      .AImage{
        width:60px;
        height:60px;
        margin-top:20px;
      }
      .collapse{
        margin:0 !important;
      }
      p,ul{
        font-weight:normal;
        font-size:14px;
        line-height:1.6;
        color:#707070;
      }
      p.lead{
        font-size:18px;
        font-weight:700;
        letter-spacing:.75px;
        line-height:0;
        margin-top:15px;
        color:#363a3c;
      }
      .container{
        display:block !important;
        max-width:600px !important;
        margin:0 auto !important;
        clear:both !important;
        border-radius:4px;
      }
      .content{
        padding:15px;
        max-width:600px;
        margin:0 auto;
        display:block;
      }
      .content table{
        width:100%;
      }
      .clear{
        display:block;
        clear:both;
      }
      .bg,.bg td{
        display:block !important;
        position:absolute !important;
        width:100% !important;
        height:200px !important;
      }
      .bg img{
        position:relative !important;
        display:block !important;
        min-height:100% !important;
        min-width:100% !important;
      }
      .mainTable{
        width:586px;
        background:#fff;
        padding:30px;
      }
      @media only screen and (max-width: 600px){
        a[class=btn]{
          display:block !important;
          margin-bottom:10px !important;
          background-image:none !important;
          margin-right:0 !important;
        }
      }
      @media only screen and (max-width: 600px){
        div[class=column]{
          width:auto !important;
          float:none !important;
        }
        table.social div[class=column]{
          width:auto !important;
        }
        .mainTable {
          padding:5px;
          width:350px;
        }
      }
      @media only screen and (max-width: 350px){
        .mainTable{
          padding:5px;
          width:300px;
        }
      }
    </style>
  </head>
  <body bgcolor="#F1F1F1">
    <table style="background:#142166;border-collapse:collapse;">
      <tr>
        <td valign="bottom" style="width:50%;">
          <div style="height:300px;background-color:#F1F1F1;">
          </div>
        </td>
        <td>
          <center>
            <img src="%asset_url%/images/logo.png" alt="logo.png" style="padding: 32px 0px">
            <table class="mainTable">
              <tr>
                <td>
                  ${sectionInsert}
                  <p>
                    Best Regards,<br>
                    <br>
                    -Andi,<br>
                    Auvenir Customer Success Team
                  </p>
                </td>
              </tr>
            </table>
          </center>
        </td>
        <td valign="bottom" style="width:50%;">
          <div style="height:300px;background-color:#F1F1F1;"></div>
        </td>
      </tr>
    </table>
    <div style="width:100%;">
      <center>
        <table bgcolor="#F1F1F1" style="width:100%;">
          <tr>
            <td align="center">
              <p style="margin-top:0px;">
                <span class="footerElement imageHolder">
                  <img class="AImage" src="%asset_url%/images/icon.png" alt="icon.png">
                </span>
                <span class="footerElement punchLine">Audit, Smarter.</span>
                <span class="footerElement">225 Richmond Street West, Suite 402, Toronto, ON M5V1W2</span>
                <span class="footerElement">This email is subject to Auvenir’s standard <a style="color:#50baa8;" href="%url%/terms">terms of service</a> and <a style="color:#50baa8;" href="%url%/privacy">privacy statement.</a></span>
                <span class="footerElement">To unsubscribe, please
                <a style="color:#50baa8;" href="mailto:unsubscribe@auvenir.com?Subject=Unsubscribe">click here</a>.</span>
              </p>
            </td>
          </tr>
        </table>
      </center>
    </div>
  </body>`
  return emailContent
}

/**
 * EmailCopyList is a list of body copies that can be injected to the email htmlBody.
 * The header and footer are in the default.json
 */

var EmailCopyList = {
  // active & onboarding / pending & waitlist are exactly same.
  // confirmEmail is not being used yet but have a template image on Avocode for this case. (~Lucy)
  active: {
    subject: 'Sign in to Auvenir!',
    content: {
      html: generateHtml('active'),
      plain: `
        Welcome to Auvenir!\r\n\r\n
        Congratulations, you have been selected to be part of our exclusive beta.\r\n\r\n
        When you're ready to audit smarter, click the button below
        to create and/or login to your Auvenir account.\r\n\r\n
        %url%/checkToken?token=%token%&email=%email%\r\n\r\n
        We welcome your feedback, ideas and suggestions to make the audit experience better. Send us an email at
        feedback@auvenir.com.\r\n\r\n
        Best Regards,\r\n\r\n
        -Andi,\r\n
        Auvenir Customer Success Team`
    }
  },
  onboarding: {
    subject: 'Sign in to Auvenir!',
    content: {
      html: generateHtml('onboarding'),
      plain: `
        Welcome to Auvenir! \r\n\r\n
        Thank you for using our secure login system. \r\n\r\n
        When you're ready to audit smarter, click the link below
        to create and/or login to your Auvenir account.\r\n\r\n
        %url%/checkToken?token=%token%&email=%email%\r\n\r\n
        We welcome your feedback, ideas and suggestions to make the audit experience better. Send us an email at
        feedback@auvenir.com\r\n\r\n
        Best Regards,\r\n\r\n
        -Andi,\r\n
        Auvenir Customer Success Team`
    }
  },
  waitlist: {
    subject: 'Your Auvenir account is on the Waitlist!',
    content: {
      html: generateHtml('waitlist'),
      plain: `
        Hello,\r\n\r\n
        We are excited about your interest in
        Auvenir, where we are on a mission to make the audit process better for auditors and their clients.\r\n\r\n
        While we are working hard to make Auvenir the best solution for you,
        we'll make sure to keep you updated on our progress, including when you can start using the platform.\r\n\r\n
        Meanwhile, you can follow us on: Twitter(https://twitter.com/auvenir), LinkedIn(https://www.linkedin.com/company/10419712) or Facebook(https://www.facebook.com/auvenir) and \r\n
        e-mail us at info@auvenir.com.\r\n\r\n
        -Andi,\r\n
        Auvenir Customer Success Team`
    }
  },
  pending: {
    subject: 'Your Auvenir account is on Waitlist!',
    content: {
      html: generateHtml('pending'),
      plain: `
        Hello,\r\n\r\n
        We are excited about your interest in
        Auvenir, where we are on a mission to make the audit process better for auditors and their clients.\r\n\r\n
        While we are working hard to make Auvenir the best solution for you,
        we'll make sure to keep you updated on our progress, including when you can start using the platform.\r\n\r\n
        Meanwhile, you can follow us on: Twitter(https://twitter.com/auvenir), LinkedIn(https://www.linkedin.com/company/10419712) or Facebook(https://www.facebook.com/auvenir) and \r\n
        e-mail us at info@auvenir.com.\r\n\r\n
        -Andi,\r\n
        Auvenir Customer Success Team`
    }
  },
  verified: {
    subject: 'Your Auvenir Account is Active!',
    content: {
      html: generateHtml('verified'),
      plain: `
        Welcome to Auvenir!\r\n\r\n
        Your account has been authenticated and is now active.\r\n\r\n
        When you are ready to audit smarter, click the button below.\r\n\r\n
        %url%/checkToken?token=%token%&email=%email%\r\n\r\n
        We welcome your feedback, ideas and suggestions to make the audit experience better. Send us an email at
        feedback@auvenir.com\r\n\r\n
        -Andi,\r\n
        Auvenir Customer Success Team`
    }
  },
  clientFilesReady: {
    subject: 'Client files for %engagementName% are ready!',
    content: {
      html: generateHtml('clientFilesReady'),
      plain: `
        Hi, %auditorFirstName%\r\n\r\n
        %userFirstName% %userLastName% has uploaded all of the files you have requested for\r\n
        %engagementName% audit. They are now ready for you to download and\r\n
        review. Click the link below to view the files before downloading.\r\n
        %url%/checkToken?token=%token%&email=%email%&eid=%engagementID%\r\n\r\n
        We welcome your feedback, ideas and suggestions to make the audit experience better. Send us an email at
        feedback@auvenir.com.\r\n\r\n
        Best Regards,\r\n\r\n
        -Andi,\r\n
        Auvenir Customer Success Team`
    }
  },
  notifyClient: {
    subject: 'Audit Opinion Ready for %engagementName%',
    content: {
      html: generateHtml('notifyClient'),
      plain: `
        Hi %userFirstName%\r\n\r\n
        Your audit opinion has been uploaded by your auditor!\r\n
        Login to auvenir and go to your Files section to download.\r\n\r\n
        %url%/checkToken?token=%token%&eid=%engagementID%&email=%email% \r\n
        We welcome your feedback, ideas and suggestions to make the audit experience better. Send us an email at
        feedback@auvenir.com.\r\n\r\n
        Best Regards,\r\n\r\n
        -Andi,\r\n
        Auvenir Customer Success Team`
    }
  },
  sendEngagementInvite: {
    subject: 'Invitation from %auditorFirstName% %auditorLastName% to complete your financial audit',
    content: {
      html: generateHtml('sendEngagementInvite'),
      plain: `
        Hi, %userFirstName%!\r\n\r\n
        %auditorFirstName% %auditorLastName has invited you to join Auvenir to complete your financial audit.
        Please click below to get started!\r\n\r\n
        %url%/acceptInvite?token=%token%&eid=%engagementID%&email=%email%\r\n\r\n
        Auvenir is on a mission to make financial audits smarter, more pleasant, and more efficient. Our technology helps auditors work with their clients better.\r\n
        Here are some of the benefits.\r\n\r\n
        - Secure, cloud based platform to upload your documents\r\n
        - Customized, detailed notifications and task management system keeps everyone on schedule and on budget\r\n
        - Bank and accounting system integrations\r\n\r\n
        We welcome your feedback, ideas and suggestions to make the audit experience better. Send us an email at
        feedback@auvenir.com\r\n\r\n
        Welcome to the future of financial audit, now!`
    }
  },
  sendSuggestion: {
    subject: 'Suggestion for accounting software',
    content: {
      html: generateHtml('sendSuggestion'),
      plain: `
        Hi, Auvenir\r\n\r\n
        %userFirstName% %userLastName% uses an accounting software not on the list: \r\n\r\n
        %userText%\r\n\r\n
        This was an automated message.`
    }
  },
  sendErrorMsg: {
    subject: 'ERROR registering user device.',
    content: {
      html: generateHtml('sendErrorMsg')
    }
  }
}

module.exports = EmailCopyList
